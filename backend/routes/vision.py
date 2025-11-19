from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError as PydanticValidationError
import os
import httpx
from dotenv import load_dotenv
from utils.decorators import token_required, require_json, handle_exceptions
from config.supabase_config import supabase
from models.schemas import AnalyzeImageRequest
from models.exceptions import ValidationError, SSRFError, QuotaExceededError
from models.ssrf_validator import SSRFValidator
from models.quota_manager import QuotaManager
import logging

logger = logging.getLogger(__name__)

vision_bp = Blueprint('vision', __name__, url_prefix='/api/v1/vision')

load_dotenv()
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

@vision_bp.route('/analyze', methods=['POST'])
@token_required
@require_json
@handle_exceptions
def analyze_image():
    """Analisa imagem usando Groq Vision"""

    if not GROQ_API_KEY:
        raise ValidationError('GROQ_API_KEY não configurada')

    try:
        data = AnalyzeImageRequest(**request.json)
    except PydanticValidationError as e:
        raise ValidationError('Validação falhou', details=e.errors())

    try:
        # SSRF Protection - Validar URL
        if not SSRFValidator.is_safe_url(data.image_url):
            raise SSRFError()

        # Validar quota
        tenant_id = data.tenant_id
        if not tenant_id:
            user_tenants = supabase.table('tenant_users') \
                .select('tenant_id') \
                .eq('user_id', g.user_id) \
                .limit(1) \
                .execute()

            if user_tenants.data:
                tenant_id = user_tenants.data[0]['tenant_id']

        if tenant_id:
            QuotaManager.check_quota(tenant_id, 'api_calls_per_day')

        # Preparar payload para Groq
        content_parts = []
        if data.prompt:
            content_parts.append({'type': 'text', 'text': data.prompt})
        content_parts.append({
            'type': 'image_url',
            'image_url': {'url': data.image_url}
        })

        payload = {
            'model': 'meta-llama/llama-4-scout-17b-16e-instruct',
            'messages': [
                {
                    'role': 'user',
                    'content': content_parts
                }
            ],
            'temperature': 1,
            'max_completion_tokens': 512,
            'top_p': 1,
            'stream': False
        }

        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
            'Content-Type': 'application/json'
        }

        # Fazer request para Groq
        with httpx.Client(timeout=120) as client:
            resp = client.post(
                'https://api.groq.com/openai/v1/chat/completions',
                json=payload,
                headers=headers
            )

            if resp.status_code >= 400:
                logger.error(f'Groq API error: {resp.text}')
                raise Exception(f'Erro ao analisar imagem: {resp.status_code}')

            j = resp.json()
            content = (
                (j.get('choices') or [{}])[0]
                .get('message', {})
                .get('content', '')
            )

        # Persistir conversa se solicitado
        conversation_id = None
        if data.persist:
            try:
                titulo = (data.prompt[:60] + '...') if len(data.prompt) > 60 else data.prompt
                conv_res = supabase.table('conversations').insert({
                    'tenant_id': tenant_id,
                    'user_id': g.user_id,
                    'titulo': titulo or 'Análise de imagem'
                }).execute()

                if conv_res.data:
                    conversation_id = conv_res.data[0]['id']

                    # Salvar mensagens
                    supabase.table('messages').insert({
                        'conversation_id': conversation_id,
                        'role': 'user',
                        'content': data.prompt,
                        'image_url': data.image_url
                    }).execute()

                    supabase.table('messages').insert({
                        'conversation_id': conversation_id,
                        'role': 'assistant',
                        'content': content
                    }).execute()
            except Exception as e:
                logger.error(f'Error persisting vision analysis: {str(e)}')

        # Registrar quota
        if tenant_id:
            QuotaManager.log_usage(tenant_id, 'api_calls_per_day', g.user_id)

        logger.info('Image analyzed', extra={'user_id': g.user_id})

        return jsonify({
            'answer': content,
            'conversation_id': conversation_id
        }), 200

    except (ValidationError, SSRFError, QuotaExceededError):
        raise
    except Exception as e:
        logger.error(f'Error analyzing image: {str(e)}')
        raise
