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
