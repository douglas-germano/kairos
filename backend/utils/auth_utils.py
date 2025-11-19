from functools import wraps
from flask import request, jsonify
import jwt
import os
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash
from config.supabase_config import supabase

SECRET_KEY = os.getenv('JWT_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY deve estar definida no arquivo .env")

def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
    return token

def verify_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Token inválido'}), 401
        
        if not token:
            return jsonify({'error': 'Token não fornecido'}), 401
        
        payload = verify_token(token)
        if not payload:
            return jsonify({'error': 'Token expirado ou inválido'}), 401
        
        request.user_id = payload['user_id']
        return f(*args, **kwargs)
    
    return decorated

def user_belongs_to_tenant(user_id, tenant_id):
    res = supabase.table('tenant_users').select('id').eq('tenant_id', tenant_id).eq('user_id', user_id).limit(1).execute()
    return bool(res.data)

def user_role_in_tenant(user_id, tenant_id):
    res = supabase.table('tenant_users').select('role').eq('tenant_id', tenant_id).eq('user_id', user_id).limit(1).execute()
    if res.data:
        return res.data[0].get('role')
    return None

def require_tenant_membership(param_name='tenant_id'):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            tenant_id = kwargs.get(param_name)
            if tenant_id is None and request.is_json:
                body = request.get_json(silent=True) or {}
                tenant_id = body.get(param_name)
            if not tenant_id:
                return jsonify({'error': 'tenant_id é obrigatório'}), 400
            if not user_belongs_to_tenant(request.user_id, tenant_id):
                return jsonify({'error': 'Acesso negado ao tenant'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

def require_tenant_admin(param_name='tenant_id'):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            tenant_id = kwargs.get(param_name)
            if tenant_id is None and request.is_json:
                body = request.get_json(silent=True) or {}
                tenant_id = body.get(param_name)
            if not tenant_id:
                return jsonify({'error': 'tenant_id é obrigatório'}), 400
            role = user_role_in_tenant(request.user_id, tenant_id)
            if role not in ('admin', 'owner'):
                return jsonify({'error': 'Requer papel admin/owner no tenant'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

def require_self_user(param_name='user_id'):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            target_user_id = kwargs.get(param_name)
            if str(target_user_id) != str(request.user_id):
                return jsonify({'error': 'Acesso negado ao recurso de outro usuário'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

def require_project_access(check_owner_on_write=False, project_param='project_id'):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            project_id = kwargs.get(project_param)
            if not project_id:
                return jsonify({'error': 'project_id é obrigatório'}), 400
            res = supabase.table('projects').select('id, tenant_id, user_id').eq('id', project_id).limit(1).execute()
            if not res.data:
                return jsonify({'error': 'Projeto não encontrado'}), 404
            proj = res.data[0]
            if not user_belongs_to_tenant(request.user_id, proj['tenant_id']):
                return jsonify({'error': 'Acesso negado ao projeto'}), 403
            method = request.method.upper()
            if check_owner_on_write and method in ('PUT', 'DELETE'):
                role = user_role_in_tenant(request.user_id, proj['tenant_id'])
                if str(proj['user_id']) != str(request.user_id) and role not in ('admin', 'owner'):
                    return jsonify({'error': 'Operação permitida apenas ao owner ou admin'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator

def hash_password(password):
    """Gera hash da senha usando werkzeug"""
    return generate_password_hash(password)

def verify_password(password_hash, password):
    """Verifica se a senha corresponde ao hash"""
    return check_password_hash(password_hash, password)
