from functools import wraps
from flask import request, jsonify, g
from models.exceptions import (
    AuthenticationError,
    AuthorizationError,
    ValidationError
)
from utils.auth_utils import verify_token, user_belongs_to_tenant, user_role_in_tenant
import logging

logger = logging.getLogger(__name__)

def require_json(f):
    """Decorator que valida Content-Type application/json"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not request.is_json:
            raise ValidationError('Content-Type deve ser application/json')
        return f(*args, **kwargs)
    return decorated_function

def validate_request(schema_class):
    """Decorator que valida request body contra Pydantic schema"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                data = schema_class(**request.json or {})
                g.validated_data = data
            except Exception as e:
                raise ValidationError(
                    'Validação falhou',
                    details=str(e)
                )
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def handle_exceptions(f):
    """Decorator que trata exceções e converte em JSON"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from models.exceptions import KairosException
        try:
            return f(*args, **kwargs)
        except KairosException as e:
            logger.warning(f'Kairos exception: {e.error_code}', extra={
                'error': e.message,
                'code': e.error_code,
                'user_id': getattr(g, 'user_id', None)
            })
            return jsonify(e.to_dict()), e.status_code
        except Exception as e:
            logger.error(f'Unexpected error: {str(e)}', extra={
                'error_type': type(e).__name__,
                'user_id': getattr(g, 'user_id', None)
            })
            return jsonify({
                'error': 'Erro interno do servidor',
                'code': 'INTERNAL_ERROR'
            }), 500
    return decorated_function

def token_required(f):
    """Decorator que valida token JWT"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None

        # Verificar header Authorization
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                raise AuthenticationError('Token inválido no header')

        if not token:
            raise AuthenticationError('Token não fornecido')

        try:
            payload = verify_token(token)
            if not payload:
                raise AuthenticationError('Token expirado ou inválido')

            user_id = payload.get('user_id')
            g.user_id = user_id
            request.user_id = user_id
            
            # Tenant Context Logic
            tenant_id = request.headers.get('X-Tenant-ID')
            if tenant_id:
                # Validar se usuário pertence ao tenant
                if user_belongs_to_tenant(user_id, tenant_id):
                    g.tenant_id = tenant_id
                else:
                    # Se enviou tenant inválido/sem acesso, loga aviso mas não bloqueia autenticação
                    # (bloqueio de autorização será feito pelos decorators específicos se necessário)
                    logger.warning(f'User {user_id} attempted access to unauthorized tenant {tenant_id}')
                    g.tenant_id = None
            else:
                g.tenant_id = None

        except AuthenticationError:
            raise
        except Exception as e:
            raise AuthenticationError(f'Token inválido: {str(e)}')

        return f(*args, **kwargs)
    return decorated_function

def require_tenant_membership(tenant_param='tenant_id'):
    """Decorator que valida se usuário pertence ao tenant"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            tenant_id = request.json.get(tenant_param) if request.is_json else None
            tenant_id = tenant_id or kwargs.get(tenant_param)

            if not tenant_id:
                raise ValidationError('tenant_id é obrigatório')

            if not user_belongs_to_tenant(g.user_id, tenant_id):
                raise AuthorizationError()

            g.tenant_id = tenant_id
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_tenant_admin(tenant_param='tenant_id'):
    """Decorator que valida se usuário é admin/owner do tenant"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            tenant_id = request.json.get(tenant_param) if request.is_json else None
            tenant_id = tenant_id or kwargs.get(tenant_param)

            if not tenant_id:
                raise ValidationError('tenant_id é obrigatório')

            role = user_role_in_tenant(g.user_id, tenant_id)
            if role not in ('admin', 'owner'):
                raise AuthorizationError()

            g.tenant_id = tenant_id
            return f(*args, **kwargs)
        return decorated_function
    return decorator
