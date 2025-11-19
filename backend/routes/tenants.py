from flask import Blueprint, request, jsonify
from config.supabase_config import supabase
from utils.auth_utils import token_required, require_tenant_membership, require_tenant_admin
from datetime import date
from models.quota_manager import QuotaManager

tenants_bp = Blueprint('tenants', __name__, url_prefix='/api/v1/tenants')

@tenants_bp.route('/create', methods=['POST'])
@token_required
def create_tenant():
    data = request.json
    nome = data.get('nome')
    
    if not nome:
        return jsonify({'error': 'Nome é obrigatório'}), 400
    
    try:
        tenant = supabase.table('tenants').insert({
            'nome': nome,
            'plano': 'free'
        }).execute()
        created = tenant.data[0]
        supabase.table('tenant_users').insert({
            'tenant_id': created['id'],
            'user_id': request.user_id,
            'role': 'owner'
        }).execute()
        
        return jsonify({
            'message': 'Tenant criado com sucesso',
            'tenant': created
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>', methods=['GET'])
@token_required
@require_tenant_membership('tenant_id')
def get_tenant(tenant_id):
    try:
        tenant = supabase.table('tenants').select('*').eq('id', tenant_id).execute()
        
        if not tenant.data:
            return jsonify({'error': 'Tenant não encontrado'}), 404
        
        return jsonify(tenant.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>/quota', methods=['GET'])
@token_required
@require_tenant_membership('tenant_id')
def get_tenant_quota(tenant_id):
    try:
        tenant_res = supabase.table('tenants').select('plano').eq('id', tenant_id).limit(1).execute()
        plan = (tenant_res.data and tenant_res.data[0].get('plano')) or 'free'

        limit = QuotaManager.LIMITS_BY_PLAN.get(plan, {}).get('api_calls_per_day', 100)

        today = date.today().isoformat()
        usage_res = supabase.table('quota_logs') \
            .select('count', count='exact') \
            .eq('tenant_id', tenant_id) \
            .eq('action', 'api_calls_per_day') \
            .gte('created_at', f"{today}T00:00:00") \
            .execute()
        usage = usage_res.count or 0
        remaining = max(0, int(limit) - int(usage))
        percentage = round((usage / limit) * 100, 2) if limit else 0.0

        return jsonify({
            'plan': plan,
            'action': 'api_calls_per_day',
            'limit': limit,
            'usage': usage,
            'remaining': remaining,
            'percentage': percentage
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>/users', methods=['GET'])
@token_required
@require_tenant_membership('tenant_id')
def get_tenant_users(tenant_id):
    try:
        tu_res = supabase.table('tenant_users').select('id, tenant_id, user_id, role, created_at').eq('tenant_id', tenant_id).execute()
        rows = tu_res.data or []
        if not rows:
            return jsonify([]), 200
        user_ids = list({r['user_id'] for r in rows})
        users_res = supabase.table('users').select('id, email, nome').in_('id', user_ids).execute()
        users_map = {u['id']: {'id': u['id'], 'email': u.get('email'), 'nome': u.get('nome')} for u in (users_res.data or [])}
        enriched = [
            {
                'id': r['id'],
                'tenant_id': r['tenant_id'],
                'role': r.get('role', 'member'),
                'user': users_map.get(r['user_id'], {'id': r['user_id'], 'email': None, 'nome': None})
            }
            for r in rows
        ]
        return jsonify(enriched), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/mine', methods=['GET'])
@token_required
def get_my_tenants():
    try:
        memberships = supabase.table('tenant_users').select('tenant_id, role').eq('user_id', request.user_id).execute()
        if not memberships.data:
            return jsonify([]), 200
        tenant_ids = [m['tenant_id'] for m in memberships.data]
        tenants = supabase.table('tenants').select('*').in_('id', tenant_ids).order('created_at', desc=True).execute()
        return jsonify(tenants.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>/add-user', methods=['POST'])
@token_required
@require_tenant_admin('tenant_id')
def add_user_to_tenant(tenant_id):
    data = request.json
    user_id = data.get('user_id')
    role = data.get('role', 'member')
    
    if not user_id:
        return jsonify({'error': 'user_id é obrigatório'}), 400
    
    try:
        tenant_user = supabase.table('tenant_users').insert({
            'tenant_id': tenant_id,
            'user_id': user_id,
            'role': role
        }).execute()
        
        return jsonify({
            'message': 'Usuário adicionado ao tenant',
            'tenant_user': tenant_user.data[0]
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>/add-user-by-email', methods=['POST'])
@token_required
@require_tenant_admin('tenant_id')
def add_user_by_email(tenant_id):
    data = request.json
    email = (data.get('email') or '').strip().lower()
    role = data.get('role', 'member')

    if not email:
        return jsonify({'error': 'email é obrigatório'}), 400

    try:
        user = supabase.table('users').select('id').eq('email', email).limit(1).execute()
        if not user.data:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        user_id = user.data[0]['id']

        existing = supabase.table('tenant_users').select('id').eq('tenant_id', tenant_id).eq('user_id', user_id).limit(1).execute()
        if existing.data:
            return jsonify({'message': 'Usuário já é membro do tenant'}), 200

        tenant_user = supabase.table('tenant_users').insert({
            'tenant_id': tenant_id,
            'user_id': user_id,
            'role': role
        }).execute()
        return jsonify({'message': 'Usuário adicionado ao tenant', 'tenant_user': tenant_user.data[0]}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>/remove-user-by-email', methods=['DELETE'])
@token_required
@require_tenant_admin('tenant_id')
def remove_user_by_email(tenant_id):
    data = request.json if request.is_json else {}
    email = (data.get('email') or '').strip().lower()

    if not email:
        return jsonify({'error': 'email é obrigatório'}), 400

    try:
        user = supabase.table('users').select('id').eq('email', email).limit(1).execute()
        if not user.data:
            return jsonify({'error': 'Usuário não encontrado'}), 404
        user_id = user.data[0]['id']

        supabase.table('tenant_users').delete().eq('tenant_id', tenant_id).eq('user_id', user_id).execute()
        return jsonify({'message': 'Usuário removido do tenant'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>', methods=['PUT'])
@token_required
@require_tenant_admin('tenant_id')
def update_tenant(tenant_id):
    data = request.json
    
    try:
        tenant = supabase.table('tenants').update(data).eq('id', tenant_id).execute()
        return jsonify(tenant.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@tenants_bp.route('/<tenant_id>', methods=['DELETE'])
@token_required
@require_tenant_admin('tenant_id')
def delete_tenant(tenant_id):
    try:
        supabase.table('tenants').delete().eq('id', tenant_id).execute()
        return jsonify({'message': 'Tenant deletado'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
