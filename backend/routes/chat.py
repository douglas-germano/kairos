from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError as PydanticValidationError
from config.supabase_config import supabase
from utils.decorators import (
    token_required,
    require_json,
    handle_exceptions,
    require_tenant_membership
)
from utils.auth_utils import user_role_in_tenant
from utils.claude_client import get_claude_response
from utils.groq_client import get_groq_response
from utils.google_client import get_google_response
from models.schemas import VALID_MODELS
from models.schemas import SendMessageRequest, PaginationParams
from models.exceptions import (
    NotFoundError,
    AuthorizationError,
    ValidationError,
    QuotaExceededError
)
from models.quota_manager import QuotaManager
from utils.summary_generator import generate_conversation_title
import logging
import threading

logger = logging.getLogger(__name__)

chat_bp = Blueprint('chat', __name__, url_prefix='/api/v1/chat')

@chat_bp.route('/message', methods=['POST'])
@token_required
@require_json
@handle_exceptions
def send_message():
    """Envia mensagem e obtém resposta da IA"""
    try:
        data = SendMessageRequest(**request.json)
    except PydanticValidationError as e:
        raise ValidationError('Validação falhou', details=e.errors())

    try:
        # Tenant Context
        tenant_id = getattr(g, 'tenant_id', None)
        user_id = g.user_id
        message = data.message
        model = data.model

        # Validar quota se tenant estiver definido
        if tenant_id:
            try:
                QuotaManager.check_limit(tenant_id, 'api_calls_per_day')
                QuotaManager.check_limit(tenant_id, 'messages_per_conversation', data.conversation_id)
            except Exception as e:
                logger.error(f"Error checking quota: {e}")
                return jsonify({'error': str(e)}), 403

        messages_history = data.messages or []
        messages_history.append({
            "role": "user",
            "content": data.message
        })

        # Criar conversa se necessário
        conversation_id = data.conversation_id
        if not conversation_id:
            # Gerar título inicial
            title = message[:50] + "..."
            
            conv_data = {
                'user_id': user_id,
                'titulo': title, # Changed 'title' to 'titulo' to match schema
                'model': model,
                'tenant_id': tenant_id  # Associar ao tenant atual
            }
            
            conv_res = supabase.table('conversations').insert(conv_data).execute()
            
            if not conv_res.data:
                raise Exception('Erro ao criar conversa')

            conversation_id = conv_res.data[0]['id']
            
            # Logar criação de conversa na quota
            if tenant_id:
                QuotaManager.log_usage(tenant_id, 'conversations')


        # Salvar mensagem do usuário
        supabase.table('messages').insert({
            'conversation_id': conversation_id,
            'role': 'user',
            'content': data.message
        }).execute()

        # Obter resposta do modelo
        # Roteamento correto: Gemini -> Google, Llama -> Groq, Claude -> Anthropic
        if data.model and 'gemini' in data.model:
            claude_response = get_google_response(messages_history, model=data.model)
        elif data.model and 'llama' in data.model:
            claude_response = get_groq_response(messages_history, model=data.model)
        else:
            # Claude models (opus, sonnet)
            claude_response = get_claude_response(messages_history, model=data.model)

        # Adicionar ao histórico
        messages_history.append({
            "role": "assistant",
            "content": claude_response
        })

        # Salvar resposta
        supabase.table('messages').insert({
            'conversation_id': conversation_id,
            'role': 'assistant',
            'content': claude_response
        }).execute()

        # Atualizar conversa
        supabase.table('conversations') \
            .update({'updated_at': 'now()'}) \
            .eq('id', conversation_id) \
            .execute()

        # Logar uso da API
        if tenant_id:
            logger.info(f"Logging API usage for tenant {tenant_id}")
            QuotaManager.log_usage(tenant_id, 'api_calls_per_day', g.user_id)

        # Gerar título assincronamente se for nova conversa ou tiver poucas mensagens
        if len(messages_history) <= 2:
            def update_title(conv_id, msgs):
                try:
                    new_title = generate_conversation_title(msgs)
                    if new_title:
                        supabase.table('conversations') \
                            .update({'titulo': new_title}) \
                            .eq('id', conv_id) \
                            .execute()
                except Exception as e:
                    logger.error(f"Erro ao atualizar título: {e}")

            threading.Thread(target=update_title, args=(conversation_id, messages_history)).start()

        logger.info('Message processed', extra={
            'conversation_id': conversation_id,
            'user_id': g.user_id
        })

        return jsonify({
            'message': claude_response,
            'conversation_id': conversation_id,
            'tenant_id': tenant_id,
            'messages': messages_history
        }), 200

    except (ValidationError, AuthorizationError, QuotaExceededError):
        raise
    except Exception as e:
        logger.error(f'Error in send_message: {str(e)}', extra={
            'user_id': g.user_id
        })
        raise

@chat_bp.route('/conversations', methods=['GET'])
@token_required
@handle_exceptions
def list_conversations():
    """Lista conversas do usuário com paginação"""
    try:
        offset = request.args.get('offset', 0, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        # Validar ranges
        offset = max(0, offset)
        limit = max(1, min(100, limit))

        user_id = g.user_id
        tenant_id = getattr(g, 'tenant_id', None)

        # Base query
        query = supabase.table('conversations') \
            .select('id, titulo, created_at, updated_at', count='exact') \
            .eq('user_id', user_id)
            
        # Apply tenant_id filter if present
        if tenant_id:
            query = query.eq('tenant_id', tenant_id)
            
        # Execute count query
        total_res = query.execute()
        total_count = total_res.count

        # Execute data query with pagination
        convs_query = supabase.table('conversations') \
            .select('id, titulo, created_at, updated_at') \
            .eq('user_id', user_id)
        
        if tenant_id:
            convs_query = convs_query.eq('tenant_id', tenant_id)

        convs = convs_query \
            .order('updated_at', desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()
            
        return jsonify({
            'conversations': convs.data or [],
            'pagination': {
                'offset': offset,
                'limit': limit,
                'total': total_count,
                'has_more': (offset + limit) < (total_count or 0)
            }
        }), 200

    except Exception as e:
        logger.error(f'Error listing conversations: {str(e)}')
        raise

@chat_bp.route('/conversation/<conversation_id>', methods=['GET'])
@token_required
@handle_exceptions
def get_conversation(conversation_id):
    """Obtém conversa específica com mensagens"""
    try:
        conv = supabase.table('conversations') \
            .select('id, tenant_id, user_id, titulo, created_at, updated_at') \
            .eq('id', conversation_id) \
            .limit(1) \
            .execute()

        if not conv.data:
            raise NotFoundError('Conversa')

        conversation = conv.data[0]

        # Validar acesso
        if str(conversation['user_id']) != str(g.user_id):
            role = user_role_in_tenant(g.user_id, conversation['tenant_id'])
            if role not in ('admin', 'owner'):
                raise AuthorizationError()

        # Buscar mensagens
        msgs = supabase.table('messages') \
            .select('id, role, content, image_url, created_at') \
            .eq('conversation_id', conversation_id) \
            .order('created_at', desc=False) \
            .execute()

        return jsonify({
            'conversation': conversation,
            'messages': msgs.data or []
        }), 200

    except (NotFoundError, AuthorizationError):
        raise
    except Exception as e:
        logger.error(f'Error getting conversation: {str(e)}')
        raise

@chat_bp.route('/conversation/<conversation_id>', methods=['DELETE'])
@token_required
@handle_exceptions
def delete_conversation(conversation_id):
    """Deleta conversa e todas suas mensagens"""
    try:
        conv = supabase.table('conversations') \
            .select('id, tenant_id, user_id') \
            .eq('id', conversation_id) \
            .limit(1) \
            .execute()

        if not conv.data:
            raise NotFoundError('Conversa')

        conversation = conv.data[0]

        # Validar acesso
        if str(conversation['user_id']) != str(g.user_id):
            role = user_role_in_tenant(g.user_id, conversation['tenant_id'])
            if role not in ('admin', 'owner'):
                raise AuthorizationError()

        # Deletar mensagens e conversa
        supabase.table('messages') \
            .delete() \
            .eq('conversation_id', conversation_id) \
            .execute()

        supabase.table('conversations') \
            .delete() \
            .eq('id', conversation_id) \
            .execute()

        logger.info('Conversation deleted', extra={
            'conversation_id': conversation_id,
            'user_id': g.user_id
        })

        return jsonify({'message': 'Conversa deletada'}), 200

    except (NotFoundError, AuthorizationError):
        raise
    except Exception as e:
        logger.error(f'Error deleting conversation: {str(e)}')
        raise
