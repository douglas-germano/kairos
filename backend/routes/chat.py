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
import logging

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
        # Validar quota
        tenant_id = data.tenant_id
        if not tenant_id:
            user_tenants = supabase.table('tenant_users') \
                .select('tenant_id') \
                .eq('user_id', g.user_id) \
                .limit(1) \
                .execute()

            if not user_tenants.data:
                raise ValidationError('Usuário não pertence a nenhum tenant')

            tenant_id = user_tenants.data[0]['tenant_id']

        # Verificar quota antes de processar
        QuotaManager.check_quota(tenant_id, 'api_calls_per_day')

        messages_history = data.messages or []
        messages_history.append({
            "role": "user",
            "content": data.message
        })

        # Criar conversa se necessário
        conversation_id = data.conversation_id
        if not conversation_id:
            titulo = (data.message[:60] + '...') if len(data.message) > 60 else data.message
            conv_res = supabase.table('conversations').insert({
                'tenant_id': tenant_id,
                'user_id': g.user_id,
                'titulo': titulo
            }).execute()

            if not conv_res.data:
                raise Exception('Erro ao criar conversa')

            conversation_id = conv_res.data[0]['id']

        # Salvar mensagem do usuário
        supabase.table('messages').insert({
            'conversation_id': conversation_id,
            'role': 'user',
            'content': data.message
        }).execute()

        # Obter resposta do modelo
        if data.model and 'gemini' in data.model:
            claude_response = get_google_response(messages_history, model=data.model)
        elif data.model and data.model not in VALID_MODELS:
            claude_response = get_groq_response(messages_history, model=data.model)
        else:
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

        # Registrar uso de quota
        QuotaManager.log_usage(tenant_id, 'api_calls_per_day', g.user_id)

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

        # Contar total
        total_res = supabase.table('conversations') \
            .select('count', count='exact') \
            .eq('user_id', g.user_id) \
            .execute()

        # Buscar com paginação
        convs = supabase.table('conversations') \
            .select('id, titulo, created_at, updated_at') \
            .eq('user_id', g.user_id) \
            .order('updated_at', desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        return jsonify({
            'conversations': convs.data or [],
            'pagination': {
                'offset': offset,
                'limit': limit,
                'total': total_res.count,
                'has_more': (offset + limit) < (total_res.count or 0)
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
