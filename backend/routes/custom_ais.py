from flask import Blueprint, request, jsonify, g, Response
from pydantic import ValidationError as PydanticValidationError
from config.supabase_config import supabase
from utils.decorators import (
    token_required,
    require_json,
    handle_exceptions,
    require_tenant_membership
)
from utils.claude_client import get_claude_response
from utils.groq_client import get_groq_response
from models.schemas import VALID_MODELS
from models.schemas import CreateCustomAIRequest
from models.exceptions import (
    NotFoundError,
    AuthorizationError,
    ValidationError,
    QuotaExceededError
)
from models.quota_manager import QuotaManager
import logging

logger = logging.getLogger(__name__)

custom_ais_bp = Blueprint('custom_ais', __name__, url_prefix='/api/v1/custom-ais')

@custom_ais_bp.route('/create', methods=['POST'])
@token_required
@require_json
@require_tenant_membership('tenant_id')
@handle_exceptions
def create_custom_ai():
    """Cria nova IA personalizada"""
    try:
        data = CreateCustomAIRequest(**request.json)
    except PydanticValidationError as e:
        raise ValidationError('Validação falhou', details=e.errors())

    try:
        # Validar quota
        QuotaManager.check_quota(data.tenant_id, 'custom_ais')

        # Validar tenant existe
        tenant = supabase.table('tenants') \
            .select('id') \
            .eq('id', data.tenant_id) \
            .limit(1) \
            .execute()

        if not tenant.data:
            raise NotFoundError('Tenant')

        # Criar IA personalizada
        custom_ai = supabase.table('custom_ais').insert({
            'tenant_id': data.tenant_id,
            'user_id': g.user_id,
            'nome': data.nome,
            'descricao': data.descricao,
            'sistema_prompt': data.sistema_prompt,
            'modelo': data.modelo,
            'temperatura': data.temperatura,
            'max_tokens': data.max_tokens,
            'ativo': True
        }).execute()

        if not custom_ai.data:
            raise Exception('Erro ao criar IA personalizada')

        # Registrar uso de quota
        QuotaManager.log_usage(data.tenant_id, 'custom_ais', g.user_id)

        logger.info('Custom AI created', extra={
            'custom_ai_id': custom_ai.data[0]['id'],
            'user_id': g.user_id
        })

        return jsonify({
            'message': 'IA personalizada criada com sucesso',
            'custom_ai': custom_ai.data[0]
        }), 201

    except (NotFoundError, ValidationError, QuotaExceededError):
        raise
    except Exception as e:
        logger.error(f'Error creating custom AI: {str(e)}')
        raise

@custom_ais_bp.route('/<custom_ai_id>', methods=['GET'])
@token_required
@handle_exceptions
def get_custom_ai(custom_ai_id):
    """Obtém IA personalizada específica"""
    try:
        custom_ai = supabase.table('custom_ais') \
            .select('*') \
            .eq('id', custom_ai_id) \
            .eq('ativo', True) \
            .limit(1) \
            .execute()

        if not custom_ai.data:
            raise NotFoundError('IA personalizada')

        return jsonify(custom_ai.data[0]), 200

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f'Error getting custom AI: {str(e)}')
        import traceback
        traceback.print_exc()
        raise

@custom_ais_bp.route('/<custom_ai_id>', methods=['PUT'])
@token_required
@require_json
@handle_exceptions
def update_custom_ai(custom_ai_id):
    """Atualiza IA personalizada"""
    try:
        data = request.json
        
        # Validar se IA existe
        existing = supabase.table('custom_ais') \
            .select('tenant_id') \
            .eq('id', custom_ai_id) \
            .limit(1) \
            .execute()
            
        if not existing.data:
            raise NotFoundError('IA personalizada')
            
        tenant_id = existing.data[0]['tenant_id']
        
        # Validar permissão no tenant
        from utils.auth_utils import user_belongs_to_tenant
        if not user_belongs_to_tenant(g.user_id, tenant_id):
            raise AuthorizationError()

        # Campos permitidos para atualização
        allowed_fields = ['nome', 'descricao', 'sistema_prompt', 'modelo', 'temperatura', 'max_tokens', 'ativo']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            return jsonify({'message': 'Nenhum dado para atualizar'}), 200

        # Atualizar
        updated = supabase.table('custom_ais') \
            .update(update_data) \
            .eq('id', custom_ai_id) \
            .execute()
            
        if not updated.data:
            raise Exception('Erro ao atualizar IA personalizada')
            
        return jsonify({
            'message': 'IA personalizada atualizada com sucesso',
            'custom_ai': updated.data[0]
        }), 200

    except (NotFoundError, AuthorizationError):
        raise
    except Exception as e:
        logger.error(f'Error updating custom AI: {str(e)}')
        raise

@custom_ais_bp.route('/<custom_ai_id>', methods=['DELETE'])
@token_required
@handle_exceptions
def delete_custom_ai(custom_ai_id):
    """Deleta (soft delete) IA personalizada"""
    try:
        # Validar se IA existe
        existing = supabase.table('custom_ais') \
            .select('tenant_id') \
            .eq('id', custom_ai_id) \
            .limit(1) \
            .execute()
            
        if not existing.data:
            raise NotFoundError('IA personalizada')
            
        tenant_id = existing.data[0]['tenant_id']
        
        # Validar permissão no tenant
        from utils.auth_utils import user_belongs_to_tenant
        if not user_belongs_to_tenant(g.user_id, tenant_id):
            raise AuthorizationError()

        # Soft delete
        updated = supabase.table('custom_ais') \
            .update({'ativo': False}) \
            .eq('id', custom_ai_id) \
            .execute()
            
        return jsonify({'message': 'IA personalizada removida com sucesso'}), 200

    except (NotFoundError, AuthorizationError):
        raise
    except Exception as e:
        logger.error(f'Error deleting custom AI: {str(e)}')
        raise

@custom_ais_bp.route('/tenant/<tenant_id>', methods=['GET'])
@token_required
@require_tenant_membership('tenant_id')
@handle_exceptions
def get_tenant_custom_ais(tenant_id):
    """Lista todas as IAs personalizadas do tenant"""
    try:
        custom_ais = supabase.table('custom_ais') \
            .select('*') \
            .eq('tenant_id', tenant_id) \
            .eq('ativo', True) \
            .order('id', desc=True) \
            .execute()

        return jsonify(custom_ais.data or []), 200

    except Exception as e:
        logger.error(f'Error listing custom AIs: {str(e)}')
        raise

@custom_ais_bp.route('/<custom_ai_id>/conversations', methods=['GET'])
@token_required
@handle_exceptions
def list_custom_ai_conversations(custom_ai_id):
    """Lista conversas de uma IA personalizada"""
    try:
        ai = supabase.table('custom_ais') \
            .select('id, tenant_id') \
            .eq('id', custom_ai_id) \
            .eq('ativo', True) \
            .limit(1) \
            .execute()

        if not ai.data:
            raise NotFoundError('IA personalizada')

        tenant_id = ai.data[0]['tenant_id']

        from utils.auth_utils import user_belongs_to_tenant
        if not user_belongs_to_tenant(g.user_id, tenant_id):
            raise AuthorizationError()

        conversations = supabase.table('custom_ai_conversations') \
            .select('*') \
            .eq('custom_ai_id', custom_ai_id) \
            .order('created_at', desc=True) \
            .execute()

        return jsonify(conversations.data or []), 200

    except (NotFoundError, AuthorizationError):
        raise
    except Exception as e:
        logger.error(f'Error listing AI conversations: {str(e)}')
        raise

@custom_ais_bp.route('/<custom_ai_id>/conversations/create', methods=['POST'])
@token_required
@require_json
@handle_exceptions
def create_custom_ai_conversation(custom_ai_id):
    """Cria nova conversa com IA personalizada"""
    data = request.json or {}
    tenant_id = data.get('tenant_id')
    titulo = data.get('titulo', 'Nova Conversa')

    if not tenant_id:
        raise ValidationError('tenant_id é obrigatório')

    try:
        # Validar IA existe
        ai = supabase.table('custom_ais') \
            .select('id') \
            .eq('id', custom_ai_id) \
            .eq('tenant_id', tenant_id) \
            .limit(1) \
            .execute()

        if not ai.data:
            raise NotFoundError('IA personalizada')

        conversation = supabase.table('custom_ai_conversations').insert({
            'custom_ai_id': custom_ai_id,
            'user_id': g.user_id,
            'tenant_id': tenant_id,
            'titulo': titulo
        }).execute()

        if not conversation.data:
            raise Exception('Erro ao criar conversa')

        return jsonify({
            'message': 'Conversa criada com sucesso',
            'conversation': conversation.data[0]
        }), 201

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f'Error creating AI conversation: {str(e)}')
        raise

@custom_ais_bp.route('/conversations/<conversation_id>/send', methods=['POST'])
@token_required
@require_json
@handle_exceptions
def send_custom_ai_message(conversation_id):
    """Envia mensagem para IA personalizada"""
    data = request.json or {}
    user_message = data.get('message', '').strip()
    custom_ai_id = data.get('custom_ai_id')
    model = data.get('model')
    stream = bool(data.get('stream', False))

    if not user_message:
        raise ValidationError('message é obrigatório')

    if not custom_ai_id:
        raise ValidationError('custom_ai_id é obrigatório')

    try:
        # Validar conversa
        conv = supabase.table('custom_ai_conversations') \
            .select('id, custom_ai_id, tenant_id') \
            .eq('id', conversation_id) \
            .limit(1) \
            .execute()

        if not conv.data:
            raise NotFoundError('Conversa de agente')

        conversation = conv.data[0]

        if str(conversation.get('custom_ai_id')) != str(custom_ai_id):
            raise ValidationError('Conversa não pertence ao agente')

        # Registrar uso de quota
        QuotaManager.check_quota(conversation['tenant_id'], 'api_calls_per_day')

        # Salvar mensagem do usuário
        supabase.table('custom_ai_messages').insert({
            'conversation_id': conversation_id,
            'role': 'user',
            'conteudo': user_message
        }).execute()

        # Obter resposta da IA
        if model and 'gemini' in model:
            ai_conf = supabase.table('custom_ais').select('sistema_prompt').eq('id', custom_ai_id).limit(1).execute()
            sys_prompt = (ai_conf.data and ai_conf.data[0].get('sistema_prompt')) or None
            assistant_message = get_google_response(
                [{"role": "user", "content": user_message}],
                system_prompt=sys_prompt,
                model=model
            )
        elif model and model not in VALID_MODELS:
            ai_conf = supabase.table('custom_ais').select('sistema_prompt').eq('id', custom_ai_id).limit(1).execute()
            sys_prompt = (ai_conf.data and ai_conf.data[0].get('sistema_prompt')) or None
            assistant_message = get_groq_response(
                [{"role": "user", "content": user_message}],
                system_prompt=sys_prompt,
                model=model
            )
        else:
            assistant_message = get_claude_response(
                [{"role": "user", "content": user_message}],
                custom_ai_id=custom_ai_id,
                model=model
            )

        # Salvar resposta
        supabase.table('custom_ai_messages').insert({
            'conversation_id': conversation_id,
            'role': 'assistant',
            'conteudo': assistant_message
        }).execute()

        # Registrar quota
        QuotaManager.log_usage(
            conversation['tenant_id'],
            'api_calls_per_day',
            g.user_id
        )

        return jsonify({
            'user_message': user_message,
            'assistant_message': assistant_message
        }), 200

    except (NotFoundError, ValidationError, QuotaExceededError):
        raise
    except Exception as e:
        logger.error(f'Error sending AI message: {str(e)}')
        raise

@custom_ais_bp.route('/conversations/<conversation_id>/history', methods=['GET'])
@token_required
@handle_exceptions
def get_custom_ai_history(conversation_id):
    """Obtém histórico de mensagens da conversa"""
    try:
        messages = supabase.table('custom_ai_messages') \
            .select('*') \
            .eq('conversation_id', conversation_id) \
            .order('created_at', desc=False) \
            .execute()

        return jsonify(messages.data or []), 200

    except Exception as e:
        logger.error(f'Error getting AI history: {str(e)}')
        raise

@custom_ais_bp.route('/conversations/<conversation_id>', methods=['DELETE'])
@token_required
@handle_exceptions
def delete_custom_ai_conversation(conversation_id):
    """Deleta conversa com IA personalizada"""
    try:
        # Validar conversa existe
        conv = supabase.table('custom_ai_conversations') \
            .select('id, user_id') \
            .eq('id', conversation_id) \
            .limit(1) \
            .execute()

        if not conv.data:
            raise NotFoundError('Conversa')

        # Validar acesso
        if str(conv.data[0]['user_id']) != str(g.user_id):
            raise AuthorizationError()

        # Deletar mensagens
        supabase.table('custom_ai_messages') \
            .delete() \
            .eq('conversation_id', conversation_id) \
            .execute()

        # Deletar conversa
        supabase.table('custom_ai_conversations') \
            .delete() \
            .eq('id', conversation_id) \
            .execute()

        return jsonify({'message': 'Conversa deletada'}), 200

    except (NotFoundError, AuthorizationError):
        raise
    except Exception as e:
        logger.error(f'Error deleting AI conversation: {str(e)}')
        raise
