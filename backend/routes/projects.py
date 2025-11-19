from flask import Blueprint, request, jsonify
from config.supabase_config import supabase
from utils.auth_utils import token_required, require_tenant_membership, require_project_access, require_self_user, user_belongs_to_tenant, user_role_in_tenant

projects_bp = Blueprint('projects', __name__, url_prefix='/api/v1/projects')

@projects_bp.route('/create', methods=['POST'])
@token_required
@require_tenant_membership('tenant_id')
def create_project():
    data = request.json
    tenant_id = data.get('tenant_id')
    nome = data.get('nome', '').strip()
    descricao = data.get('descricao', '').strip()
    user_id = request.user_id
    
    if not tenant_id or not nome:
        return jsonify({'error': 'tenant_id e nome são obrigatórios'}), 400
    
    # Validar se tenant existe
    try:
        tenant = supabase.table('tenants').select('id').eq('id', tenant_id).execute()
        if not tenant.data:
            return jsonify({'error': 'Tenant não encontrado'}), 404
    except Exception as e:
        return jsonify({'error': 'Erro ao validar tenant'}), 400
    
    try:
        project = supabase.table('projects').insert({
            'tenant_id': tenant_id,
            'user_id': user_id,
            'nome': nome,
            'descricao': descricao
        }).execute()
        
        return jsonify({
            'message': 'Projeto criado com sucesso',
            'project': project.data[0]
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/files/<file_id>', methods=['GET'])
@token_required
def get_file(file_id):
    try:
        res = supabase.table('project_files').select('id, project_id, titulo, conteudo, tipo, created_at, updated_at').eq('id', file_id).limit(1).execute()
        if not res.data:
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        file = res.data[0]
        proj_res = supabase.table('projects').select('id, tenant_id, nome').eq('id', file['project_id']).limit(1).execute()
        if not proj_res.data:
            return jsonify({'error': 'Projeto não encontrado'}), 404
        proj = proj_res.data[0]
        if not user_belongs_to_tenant(request.user_id, proj['tenant_id']):
            return jsonify({'error': 'Acesso negado ao arquivo'}), 403
        file['project'] = {'id': proj['id'], 'nome': proj.get('nome')}
        return jsonify(file), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/files/<file_id>', methods=['PUT'])
@token_required
def update_file(file_id):
    data = request.json or {}
    try:
        res = supabase.table('project_files').select('id, project_id').eq('id', file_id).limit(1).execute()
        if not res.data:
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        file = res.data[0]
        proj_res = supabase.table('projects').select('id, tenant_id, user_id').eq('id', file['project_id']).limit(1).execute()
        if not proj_res.data:
            return jsonify({'error': 'Projeto não encontrado'}), 404
        proj = proj_res.data[0]
        if not user_belongs_to_tenant(request.user_id, proj['tenant_id']):
            return jsonify({'error': 'Acesso negado ao arquivo'}), 403
        role = user_role_in_tenant(request.user_id, proj['tenant_id'])
        if str(proj['user_id']) != str(request.user_id) and role not in ('admin', 'owner'):
            return jsonify({'error': 'Operação permitida apenas ao owner ou admin'}), 403
        payload = {k: v for k, v in data.items() if k in ('titulo', 'conteudo', 'tipo')}
        updated = supabase.table('project_files').update(payload).eq('id', file_id).execute()
        return jsonify(updated.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/files/<file_id>', methods=['DELETE'])
@token_required
def delete_file(file_id):
    try:
        res = supabase.table('project_files').select('id, project_id').eq('id', file_id).limit(1).execute()
        if not res.data:
            return jsonify({'error': 'Arquivo não encontrado'}), 404
        file = res.data[0]
        proj_res = supabase.table('projects').select('id, tenant_id, user_id').eq('id', file['project_id']).limit(1).execute()
        if not proj_res.data:
            return jsonify({'error': 'Projeto não encontrado'}), 404
        proj = proj_res.data[0]
        if not user_belongs_to_tenant(request.user_id, proj['tenant_id']):
            return jsonify({'error': 'Acesso negado ao arquivo'}), 403
        role = user_role_in_tenant(request.user_id, proj['tenant_id'])
        if str(proj['user_id']) != str(request.user_id) and role not in ('admin', 'owner'):
            return jsonify({'error': 'Operação permitida apenas ao owner ou admin'}), 403
        supabase.table('project_files').delete().eq('id', file_id).execute()
        return jsonify({'message': 'Arquivo deletado'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/<project_id>', methods=['GET'])
@token_required
@require_project_access(check_owner_on_write=False)
def get_project(project_id):
    try:
        project = supabase.table('projects').select('*').eq('id', project_id).execute()
        
        if not project.data:
            return jsonify({'error': 'Projeto não encontrado'}), 404
        
        return jsonify(project.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/tenant/<tenant_id>', methods=['GET'])
@token_required
@require_tenant_membership('tenant_id')
def get_tenant_projects(tenant_id):
    try:
        projects = supabase.table('projects').select('*').eq('tenant_id', tenant_id).order('created_at', desc=True).execute()
        return jsonify(projects.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/user/<user_id>', methods=['GET'])
@token_required
@require_self_user('user_id')
def get_user_projects(user_id):
    try:
        projects = supabase.table('projects').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
        return jsonify(projects.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/<project_id>', methods=['PUT'])
@token_required
@require_project_access(check_owner_on_write=True)
def update_project(project_id):
    data = request.json
    if not isinstance(data, dict):
        return jsonify({'error': 'Dados inválidos'}), 400
    data = {k: v for k, v in data.items() if k in ('nome', 'descricao')}
    
    try:
        project = supabase.table('projects').update(data).eq('id', project_id).execute()
        return jsonify(project.data[0]), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/<project_id>', methods=['DELETE'])
@token_required
@require_project_access(check_owner_on_write=True)
def delete_project(project_id):
    try:
        supabase.table('projects').delete().eq('id', project_id).execute()
        return jsonify({'message': 'Projeto deletado'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/<project_id>/files', methods=['GET'])
@token_required
@require_project_access(check_owner_on_write=False)
def list_project_files(project_id):
    try:
        files = supabase.table('project_files').select('id, titulo, tipo, created_at, updated_at').eq('project_id', project_id).order('updated_at', desc=True).execute()
        return jsonify(files.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/<project_id>/files/create', methods=['POST'])
@token_required
@require_project_access(check_owner_on_write=False)
def create_project_file(project_id):
    data = request.json
    titulo = (data.get('titulo') or '').strip()
    conteudo = data.get('conteudo')
    tipo = data.get('tipo', 'documento')
    if not titulo:
        return jsonify({'error': 'Título é obrigatório'}), 400
    try:
        created = supabase.table('project_files').insert({
            'project_id': project_id,
            'titulo': titulo,
            'conteudo': conteudo,
            'tipo': tipo
        }).execute()
        return jsonify(created.data[0]), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@projects_bp.route('/files/mine', methods=['GET'])
@token_required
def list_my_files():
    try:
        memberships = supabase.table('tenant_users').select('tenant_id').eq('user_id', request.user_id).execute()
        if not memberships.data:
            return jsonify([]), 200
        tenant_ids = [m['tenant_id'] for m in memberships.data]
        projs = supabase.table('projects').select('id, nome, tenant_id').in_('tenant_id', tenant_ids).execute()
        if not projs.data:
            return jsonify([]), 200
        proj_map = {p['id']: {'id': p['id'], 'nome': p.get('nome')} for p in projs.data}
        proj_ids = list(proj_map.keys())
        files = supabase.table('project_files').select('id, project_id, titulo, tipo, created_at, updated_at').in_('project_id', proj_ids).order('updated_at', desc=True).execute()
        enriched = [
            {
                **f,
                'project': proj_map.get(f['project_id'])
            } for f in (files.data or [])
        ]
        return jsonify(enriched), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 400
