from flask import Flask, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging

# Importar blueprints
from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.custom_ais import custom_ais_bp
from routes.images import images_bp
from routes.projects import projects_bp
from routes.swipes import swipes_bp
from routes.tenants import tenants_bp
from routes.vision import vision_bp
from routes.voice import voice_bp
from routes.web import web_bp

# Importar configuração
from config.logging_config import setup_logging, RequestContextFilter
from models.exceptions import KairosException

# Setup
app = Flask(__name__)
CORS(app)

# Limiter
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["1000 per hour"]
)

# Logging
logger = setup_logging(app)
logging.getLogger().addFilter(RequestContextFilter())

# Registrar blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(chat_bp)
app.register_blueprint(custom_ais_bp)
app.register_blueprint(images_bp)
app.register_blueprint(projects_bp)
app.register_blueprint(swipes_bp)
app.register_blueprint(tenants_bp)
app.register_blueprint(vision_bp)
app.register_blueprint(voice_bp)
app.register_blueprint(web_bp)

# Error handlers
@app.errorhandler(KairosException)
def handle_kairos_exception(error):
    logger.warning(f'Kairos exception: {error.error_code}', extra={
        'error': error.message,
        'code': error.error_code,
        'status': error.status_code,
        'user_id': getattr(g, 'user_id', None)
    })
    return jsonify(error.to_dict()), error.status_code

@app.errorhandler(Exception)
def handle_unexpected_exception(error):
    logger.error(f'Unexpected error: {str(error)}', extra={
        'error_type': type(error).__name__,
        'user_id': getattr(g, 'user_id', None)
    })
    return jsonify({
        'error': 'Erro interno do servidor',
        'code': 'INTERNAL_ERROR'
    }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'}), 200

@app.route('/api/v1', methods=['GET'])
def api_info():
    """Informações da API"""
    return jsonify({
        'name': 'KAIROS API',
        'version': '1.0.0',
        'status': 'running'
    }), 200

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )
