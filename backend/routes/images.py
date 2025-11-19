from flask import Blueprint, request, jsonify
import os
import httpx
from dotenv import load_dotenv
from utils.auth_utils import token_required

images_bp = Blueprint('images', __name__, url_prefix='/api/v1/images')

load_dotenv()
REPLICATE_API_TOKEN = os.getenv('REPLICATE_API_TOKEN')

@images_bp.route('/create', methods=['POST'])
@token_required
def create_image():
    data = request.json or {}
    prompt = data.get('prompt', '').strip()
    provider = data.get('provider', 'google') # Default to google (Nano Banana)
    width = int(data.get('width') or 1024)
    height = int(data.get('height') or 1024)

    if not prompt:
        return jsonify({'error': 'prompt é obrigatório'}), 400

    try:
        if provider == 'google':
            from utils.google_client import generate_image_with_google
            image_data_url = generate_image_with_google(prompt, width, height)
            return jsonify({
                'image_url': image_data_url, # Retorna data URL diretamente
                'provider': 'google'
            }), 200
            
        # Fallback to Replicate if provider is replicate
        elif provider == 'replicate':
            if not REPLICATE_API_TOKEN:
                return jsonify({'error': 'REPLICATE_API_TOKEN não configurada'}), 500
                
            model_owner = 'black-forest-labs'
            model_name = 'flux-1.1-pro'
            url = f'https://api.replicate.com/v1/models/{model_owner}/{model_name}/predictions'
            headers = {
                'Authorization': f'Bearer {REPLICATE_API_TOKEN}',
                'Content-Type': 'application/json',
                'Prefer': 'wait'
            }
            input_payload = {
                'prompt': prompt,
                'width': width,
                'height': height
            }
            payload = { 'input': input_payload }

            with httpx.Client(timeout=60) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code >= 400:
                    return jsonify({'error': resp.text}), 400
                body = resp.json()
                output = body.get('output')
                image_url = None
                if isinstance(output, dict) and 'url' in output:
                    image_url = output['url']
                elif isinstance(output, list) and output and isinstance(output[0], str):
                    image_url = output[0]

                return jsonify({
                    'prediction': body,
                    'image_url': image_url,
                    'provider': 'replicate'
                }), 200
        else:
            return jsonify({'error': 'Provedor inválido'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500