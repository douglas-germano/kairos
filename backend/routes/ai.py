from flask import Blueprint, request, jsonify, g
from utils.decorators import token_required, handle_exceptions
from utils.claude_client import client
from models.quota_manager import QuotaManager
import logging

logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/v1/ai')

@ai_bp.route('/improve-text', methods=['POST'])
@token_required
@handle_exceptions
def improve_text():
    """Melhora o texto selecionado usando IA"""
    data = request.json
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({'error': 'Texto é obrigatório'}), 400
    
    tenant_id = g.tenant_id
    user_id = g.user_id
    
    # Verificar quota
    QuotaManager.check_quota(tenant_id, 'api_calls_per_day')
    
    try:
        prompt = f"""Melhore o seguinte texto, tornando-o mais claro, conciso e profissional. 
Mantenha o tom e o significado original, mas aprimore a escrita.

Texto original:
{text}

Texto melhorado:"""

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        improved_text = response.content[0].text
        
        # Registrar uso de quota
        QuotaManager.log_usage(tenant_id, user_id, 'api_calls_per_day')
        
        return jsonify({'improved_text': improved_text}), 200
        
    except Exception as e:
        logger.error(f'Error improving text: {str(e)}')
        return jsonify({'error': 'Erro ao melhorar texto'}), 500

@ai_bp.route('/continue-writing', methods=['POST'])
@token_required
@handle_exceptions
def continue_writing():
    """Continua escrevendo baseado no contexto"""
    data = request.json
    context = data.get('context', '').strip()
    
    if not context:
        return jsonify({'error': 'Contexto é obrigatório'}), 400
    
    tenant_id = g.tenant_id
    user_id = g.user_id
    
    # Verificar quota
    QuotaManager.check_quota(tenant_id, 'api_calls_per_day')
    
    try:
        prompt = f"""Continue escrevendo o texto a seguir de forma natural e coerente. 
Escreva aproximadamente 2-3 parágrafos que deem continuidade ao conteúdo.

Texto atual:
{context}

Continuação:"""

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        
        continuation = response.content[0].text
        
        # Registrar uso de quota
        QuotaManager.log_usage(tenant_id, user_id, 'api_calls_per_day')
        
        return jsonify({'continuation': continuation}), 200
        
    except Exception as e:
        logger.error(f'Error continuing writing: {str(e)}')
        return jsonify({'error': 'Erro ao continuar escrevendo'}), 500

@ai_bp.route('/summarize', methods=['POST'])
@token_required
@handle_exceptions
def summarize_text():
    """Resume o texto selecionado"""
    data = request.json
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({'error': 'Texto é obrigatório'}), 400
    
    tenant_id = g.tenant_id
    user_id = g.user_id
    
    # Verificar quota
    QuotaManager.check_quota(tenant_id, 'api_calls_per_day')
    
    try:
        prompt = f"""Crie um resumo conciso e objetivo do seguinte texto, 
mantendo os pontos principais e informações essenciais.

Texto:
{text}

Resumo:"""

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        
        summary = response.content[0].text
        
        # Registrar uso de quota
        QuotaManager.log_usage(tenant_id, user_id, 'api_calls_per_day')
        
        return jsonify({'summary': summary}), 200
        
    except Exception as e:
        logger.error(f'Error summarizing text: {str(e)}')
        return jsonify({'error': 'Erro ao resumir texto'}), 500

@ai_bp.route('/translate', methods=['POST'])
@token_required
@handle_exceptions
def translate_text():
    """Traduz o texto para outro idioma"""
    data = request.json
    text = data.get('text', '').strip()
    target_language = data.get('target_language', 'inglês').strip()
    
    if not text:
        return jsonify({'error': 'Texto é obrigatório'}), 400
    
    tenant_id = g.tenant_id
    user_id = g.user_id
    
    # Verificar quota
    QuotaManager.check_quota(tenant_id, 'api_calls_per_day')
    
    try:
        prompt = f"""Traduza o seguinte texto para {target_language}, 
mantendo o tom e o significado original.

Texto original:
{text}

Tradução para {target_language}:"""

        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        
        translation = response.content[0].text
        
        # Registrar uso de quota
        QuotaManager.log_usage(tenant_id, user_id, 'api_calls_per_day')
        
        return jsonify({'translation': translation}), 200
        
    except Exception as e:
        logger.error(f'Error translating text: {str(e)}')
        return jsonify({'error': 'Erro ao traduzir texto'}), 500
