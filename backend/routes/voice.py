from flask import Blueprint, request, jsonify, g
import os
import httpx
from dotenv import load_dotenv
from utils.decorators import token_required, handle_exceptions
from models.schemas import TranscribeAudioRequest
from models.exceptions import ValidationError, QuotaExceededError
from models.quota_manager import QuotaManager
import logging

logger = logging.getLogger(__name__)

voice_bp = Blueprint('voice', __name__, url_prefix='/api/v1/voice')

load_dotenv()
GROQ_API_KEY = os.getenv('GROQ_API_KEY')

MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25MB

@voice_bp.route('/transcribe', methods=['POST'])
@token_required
@handle_exceptions
def transcribe_audio():
    """Transcreve arquivo de áudio"""

    if not GROQ_API_KEY:
        raise ValidationError('GROQ_API_KEY não configurada')

    form = request.form or {}
    model = (form.get('model') or 'whisper-large-v3-turbo').strip()
    language = (form.get('language') or '').strip() or None

    file = request.files.get('file')
    url = form.get('url')

    if not file and not url:
        raise ValidationError('Arquivo de áudio (file) ou url são obrigatórios')

    try:
        # Validar tamanho do arquivo
        if file:
            if file.content_length and file.content_length > MAX_AUDIO_SIZE:
                raise ValidationError(
                    f'Arquivo muito grande (máximo {MAX_AUDIO_SIZE / 1024 / 1024}MB)'
                )

        headers = {
            'Authorization': f'Bearer {GROQ_API_KEY}',
        }
        data = {
            'model': model,
            'response_format': 'text',
        }
        if language:
            data['language'] = language

        files = None
        if file:
            filename = getattr(file, 'filename', None) or 'audio.webm'
            mimetype = getattr(file, 'mimetype', None) or 'audio/webm'
            files = {
                'file': (filename, file.stream, mimetype)
            }
        else:
            data['url'] = url

        # Fazer request para Groq
        with httpx.Client(timeout=60) as client:
            resp = client.post(
                'https://api.groq.com/openai/v1/audio/transcriptions',
                headers=headers,
                data=data,
                files=files
            )

            if resp.status_code >= 400:
                logger.error(f'Groq transcription error: {resp.text}')
                raise Exception(f'Erro ao transcrever: {resp.status_code}')

            text = resp.text or ''

        logger.info('Audio transcribed', extra={'user_id': g.user_id})

        return jsonify({'text': text}), 200

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f'Error transcribing audio: {str(e)}')
        raise
