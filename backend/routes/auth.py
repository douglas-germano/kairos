from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError as PydanticValidationError
from config.supabase_config import supabase
from utils.auth_utils import generate_token, hash_password, verify_password
from utils.decorators import require_json, handle_exceptions
from models.schemas import RegisterRequest, LoginRequest
from models.exceptions import (
    ValidationError,
    ConflictError,
    AuthenticationError,
    NotFoundError
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import logging
import random
import string
from datetime import datetime, timedelta, timezone
from utils.email_client import send_recovery_email

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/v1/auth')
limiter = Limiter(key_func=get_remote_address)

@auth_bp.route('/register', methods=['POST'])
@require_json
@handle_exceptions
@limiter.limit("5 per minute")
def register():
    """
    Registra novo usuário.

    Body:
        - email: str (email válido)
        - nome: str (1-100 chars)
        - password: str (min 6 chars)
    """
    try:
        data = RegisterRequest(**request.json)
    except PydanticValidationError as e:
        raise ValidationError('Validação falhou', details=e.errors())

    email = data.email.lower().strip()

    try:
        # Verificar se email já existe
        existing = supabase.table('users') \
            .select('id') \
            .eq('email', email) \
            .limit(1) \
            .execute()

        if existing.data:
            logger.warning(f'Duplicate email registration: {email}')
            raise ConflictError('Email já cadastrado')

        # Hash da senha
        password_hash = hash_password(data.password)

        # Criar usuário
        user = supabase.table('users').insert({
            'email': email,
            'nome': data.nome,
            'password_hash': password_hash
        }).execute()

        if not user.data:
            raise Exception('Erro ao criar usuário')

        user_data = user.data[0]
        token = generate_token(user_data['id'])

        # Remover password_hash da resposta (garantido)
        response_data = {
            'id': user_data['id'],
            'email': user_data['email'],
            'nome': user_data['nome'],
            'created_at': user_data.get('created_at')
        }

        logger.info(f'User registered: {email}', extra={'user_id': user_data['id']})

        return jsonify({
            'message': 'Usuário criado com sucesso',
            'token': token,
            'user': response_data
        }), 201

    except (ConflictError, ValidationError):
        raise
    except Exception as e:
        logger.error(f'Registration error: {str(e)}', extra={'email': email})
        raise

@auth_bp.route('/login', methods=['POST'])
@require_json
@handle_exceptions
@limiter.limit("5 per minute")
def login():
    """
    Autentica usuário.

    Body:
        - email: str
        - password: str
    """
    try:
        data = LoginRequest(**request.json)
    except PydanticValidationError as e:
        raise ValidationError('Validação falhou', details=e.errors())

    email = data.email.lower().strip()

    try:
        user = supabase.table('users') \
            .select('*') \
            .eq('email', email) \
            .limit(1) \
            .execute()

        if not user.data:
            logger.warning(f'Login attempt with non-existent email: {email}')
            raise AuthenticationError('Email ou senha incorretos')

        user_data = user.data[0]
        password_hash = user_data.get('password_hash')

        if not password_hash:
            logger.warning(f'User without password: {email}')
            raise AuthenticationError('Usuário precisa redefinir senha')

        # Verificar senha
        if not verify_password(password_hash, data.password):
            logger.warning(f'Failed login attempt: {email}')
            raise AuthenticationError('Email ou senha incorretos')

        token = generate_token(user_data['id'])

        # Remover password_hash (garantido)
        response_data = {
            'id': user_data['id'],
            'email': user_data['email'],
            'nome': user_data['nome'],
            'created_at': user_data.get('created_at')
        }

        logger.info(f'User logged in: {email}', extra={'user_id': user_data['id']})

        return jsonify({
            'message': 'Login realizado com sucesso',
            'token': token,
            'user': response_data
        }), 200

    except (AuthenticationError, ValidationError):
        raise
    except Exception as e:
        logger.error(f'Login error: {str(e)}', extra={'email': email})
        raise

@auth_bp.route('/user/<user_id>', methods=['GET'])
@handle_exceptions
def get_user(user_id):
    """Obtém informações do usuário"""
    try:
        user = supabase.table('users') \
            .select('id, email, nome, created_at') \
            .eq('id', user_id) \
            .limit(1) \
            .execute()

        if not user.data:
            raise NotFoundError('Usuário')

        return jsonify(user.data[0]), 200

    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f'Error fetching user: {str(e)}', extra={'user_id': user_id})
        raise

@auth_bp.route('/forgot-password', methods=['POST'])
@require_json
@handle_exceptions
@limiter.limit("3 per hour")
def forgot_password():
    """
    Solicita recuperação de senha.
    Body: { "email": "..." }
    """
    data = request.json
    email = data.get('email', '').lower().strip()
    
    if not email:
        raise ValidationError('Email é obrigatório')

    # Verificar se usuário existe
    user = supabase.table('users').select('id').eq('email', email).execute()
    if not user.data:
        raise ValidationError('Email não cadastrado')

    # Gerar código de 6 dígitos
    code = ''.join(random.choices(string.digits, k=6))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    # Salvar no banco
    supabase.table('password_resets').insert({
        'email': email,
        'code': code,
        'expires_at': expires_at.isoformat()
    }).execute()

    # Enviar email
    if send_recovery_email(email, code):
        return jsonify({'message': 'Código enviado com sucesso'}), 200
    else:
        raise Exception('Erro ao enviar email')

@auth_bp.route('/verify-code', methods=['POST'])
@require_json
@handle_exceptions
@limiter.limit("5 per minute")
def verify_code():
    """
    Verifica código de recuperação.
    Body: { "email": "...", "code": "..." }
    """
    data = request.json
    email = data.get('email', '').lower().strip()
    code = data.get('code', '').strip()

    if not email or not code:
        raise ValidationError('Email e código são obrigatórios')

    # Buscar código válido
    res = supabase.table('password_resets') \
        .select('*') \
        .eq('email', email) \
        .eq('code', code) \
        .gt('expires_at', datetime.now(timezone.utc).isoformat()) \
        .order('created_at', desc=True) \
        .limit(1) \
        .execute()

    if not res.data:
        raise ValidationError('Código inválido ou expirado')

    return jsonify({'message': 'Código válido', 'valid': True}), 200

@auth_bp.route('/reset-password', methods=['POST'])
@require_json
@handle_exceptions
@limiter.limit("3 per hour")
def reset_password():
    """
    Redefine a senha.
    Body: { "email": "...", "code": "...", "new_password": "..." }
    """
    data = request.json
    email = data.get('email', '').lower().strip()
    code = data.get('code', '').strip()
    new_password = data.get('new_password', '')

    if not email or not code or not new_password:
        raise ValidationError('Todos os campos são obrigatórios')

    if len(new_password) < 6:
        raise ValidationError('A senha deve ter no mínimo 6 caracteres')

    # Verificar código novamente
    res = supabase.table('password_resets') \
        .select('*') \
        .eq('email', email) \
        .eq('code', code) \
        .gt('expires_at', datetime.now(timezone.utc).isoformat()) \
        .order('created_at', desc=True) \
        .limit(1) \
        .execute()

    if not res.data:
        raise ValidationError('Código inválido ou expirado')

    # Hash da nova senha
    password_hash = hash_password(new_password)

    # Atualizar usuário
    update = supabase.table('users') \
        .update({'password_hash': password_hash}) \
        .eq('email', email) \
        .execute()

    if not update.data:
        raise Exception('Erro ao atualizar senha')

    # Invalidar códigos usados (opcional, mas recomendado)
    supabase.table('password_resets') \
        .delete() \
        .eq('email', email) \
        .execute()

    return jsonify({'message': 'Senha redefinida com sucesso'}), 200
