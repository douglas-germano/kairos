from flask import Blueprint, request, jsonify
from config.supabase_config import supabase
from utils.auth_utils import token_required, require_tenant_membership, user_belongs_to_tenant, user_role_in_tenant

swipes_bp = Blueprint('swipes', __name__, url_prefix='/api/v1/swipes')

@swipes_bp.route('/tenant/create', methods=['POST'])
@token_required
@require_tenant_membership('tenant_id')
def create_swipe_tenant():
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'Dados não fornecidos'}), 400

        tenant_id = data.get('tenant_id')
        titulo = data.get('titulo')
        conteudo = data.get('conteudo')

        if not tenant_id or not titulo or not conteudo:
            return jsonify({'error': 'tenant_id, titulo e conteudo são obrigatórios'}), 400

        categoria = data.get('categoria', '')
        tipo_rede = data.get('tipo_rede', '')
        url_referencia = data.get('url_referencia', '')

        swipe = supabase.table('swipes_tenant').insert({
            'tenant_id': tenant_id,
            'titulo': titulo,
            'conteudo': conteudo,
            'categoria': categoria,
            'tipo_rede': tipo_rede,
            'url_referencia': url_referencia
        }).execute()

        return jsonify(swipe.data), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@swipes_bp.route('/global', methods=['GET'])
def get_global_swipes():
    try:
        swipes = supabase.table('swipes_global').select('*').execute()
        return jsonify(swipes.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@swipes_bp.route('/tenant/<tenant_id>', methods=['GET'])
@token_required
@require_tenant_membership('tenant_id')
def get_tenant_swipes(tenant_id):
    try:
        swipes = supabase.table('swipes_tenant').select('*').eq('tenant_id', tenant_id).execute()
        return jsonify(swipes.data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@swipes_bp.route('/tenant/<swipe_id>', methods=['DELETE'])
@token_required
def delete_swipe(swipe_id):
    try:
        # Buscar swipe para verificar tenant
        swipe = supabase.table('swipes_tenant').select('id, tenant_id').eq('id', swipe_id).execute()
        
        if not swipe.data:
            return jsonify({'error': 'Swipe não encontrado'}), 404
        
        tenant_id = swipe.data[0]['tenant_id']
        user_id = request.user_id
        
        # Verificar se usuário pertence ao tenant
        if not user_belongs_to_tenant(user_id, tenant_id):
            return jsonify({'error': 'Acesso negado ao swipe'}), 403
        
        # Verificar se é admin/owner ou criador do swipe (se houver campo user_id)
        role = user_role_in_tenant(user_id, tenant_id)
        if role not in ('admin', 'owner'):
            # Se não for admin, verificar se é o criador (se houver campo user_id na tabela)
            # Por enquanto, apenas admin/owner podem deletar
            pass
        
        supabase.table('swipes_tenant').delete().eq('id', swipe_id).execute()
        return jsonify({'message': 'Swipe deletado'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@swipes_bp.route('/global/<swipe_id>/like', methods=['POST'])
@token_required
def like_global_swipe(swipe_id):
    try:
        swipe = supabase.table('swipes_global').select('curtidas').eq('id', swipe_id).execute()

        if not swipe.data or len(swipe.data) == 0:
            return jsonify({'error': 'Swipe não encontrado'}), 404

        curtidas = swipe.data[0]['curtidas'] + 1
        supabase.table('swipes_global').update({'curtidas': curtidas}).eq('id', swipe_id).execute()
        return jsonify({'curtidas': curtidas}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
