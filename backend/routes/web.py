from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from utils.auth_utils import token_required
from config.supabase_config import supabase
from utils.claude_client import client

web_bp = Blueprint('web', __name__, url_prefix='/api/v1/web')

load_dotenv()

@web_bp.route('/search', methods=['POST'])
@token_required
def search_web():
    data = request.json or {}
    query = (data.get('query') or '').strip()
    if not query:
        return jsonify({'error': 'query é obrigatório'}), 400
    if len(query) > 4000:
        query = query[:4000]

    try:
        max_uses = int(data.get('max_uses') or 5)
        allowed = data.get('allowed_domains')
        blocked = data.get('blocked_domains')
        user_location = data.get('user_location')
        tool_def = {
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": max_uses,
        }
        if isinstance(allowed, list):
            tool_def["allowed_domains"] = [str(d) for d in allowed]
        elif isinstance(blocked, list):
            tool_def["blocked_domains"] = [str(d) for d in blocked]
        if isinstance(user_location, dict):
            tool_def["user_location"] = user_location

        resp = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{ "role": "user", "content": query }],
            tools=[tool_def]
        )

        # Extrair texto e possíveis fontes (suporta dict e objetos)
        text_parts = []
        sources = []
        try:
            for item in resp.content or []:
                itype = item.get('type') if isinstance(item, dict) else getattr(item, 'type', None)
                if itype == 'text':
                    t = item.get('text') if isinstance(item, dict) else getattr(item, 'text', None)
                    if isinstance(t, str):
                        text_parts.append(t)
                    cites = item.get('citations') if isinstance(item, dict) else getattr(item, 'citations', None)
                    for c in (cites or []):
                        curl = c.get('url') if isinstance(c, dict) else getattr(c, 'url', None)
                        ctitle = c.get('title') if isinstance(c, dict) else getattr(c, 'title', '')
                        if curl:
                            sources.append({'title': ctitle or '', 'url': curl})
                elif itype == 'web_search_tool_result':
                    content_list = item.get('content') if isinstance(item, dict) else getattr(item, 'content', None)
                    if isinstance(content_list, list):
                        for res in content_list:
                            rtype = res.get('type') if isinstance(res, dict) else getattr(res, 'type', None)
                            if rtype == 'web_search_result':
                                url = res.get('url') if isinstance(res, dict) else getattr(res, 'url', None)
                                title = res.get('title') if isinstance(res, dict) else getattr(res, 'title', '')
                                if url:
                                    sources.append({'title': title or '', 'url': url})
        except Exception:
            pass
        text = '\n\n'.join(text_parts) if text_parts else (getattr(resp, 'output_text', '') or '')

        # Persistir conversa e mensagens quando solicitado
        conversation_id = None
        if bool(data.get('persist', True)):
            try:
                tenant_id = data.get('tenant_id')
                if not tenant_id:
                    user_tenants = supabase.table('tenant_users').select('tenant_id').eq('user_id', request.user_id).limit(1).execute()
                    if user_tenants.data:
                        tenant_id = user_tenants.data[0]['tenant_id']
                titulo = (query[:60] + '...') if len(query) > 60 else query
                conv_res = supabase.table('conversations').insert({
                    'tenant_id': tenant_id,
                    'user_id': request.user_id,
                    'titulo': titulo
                }).execute()
                conversation_id = conv_res.data[0]['id']
                # Salvar mensagens
                supabase.table('messages').insert({
                    'conversation_id': conversation_id,
                    'role': 'user',
                    'content': query
                }).execute()
                links_md = ''
                if sources:
                    links_md = '\n\nFontes:\n' + '\n'.join([f"- {s['title'] or s['url']} ({s['url']})" for s in sources])
                supabase.table('messages').insert({
                    'conversation_id': conversation_id,
                    'role': 'assistant',
                    'content': (text or '') + links_md
                }).execute()
            except Exception as persist_err:
                print(f"Erro ao persistir conversa web (Claude): {persist_err}")

        return jsonify({ 'answer': text, 'sources': sources, 'conversation_id': conversation_id }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@web_bp.route('/visit', methods=['POST'])
@token_required
def visit_website():
    data = request.json or {}
    url = (data.get('url') or '').strip()
    instruction = (data.get('instruction') or '').strip()
    if not url:
        return jsonify({'error': 'url é obrigatório'}), 400
    if len(url) > 2048:
        url = url[:2048]

    try:
        content = url if not instruction else f"{instruction}: {url}"
        max_uses = int(data.get('max_uses') or 3)
        tool_def = {
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": max_uses,
        }
        resp = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1024,
            messages=[{ "role": "user", "content": content }],
            tools=[tool_def]
        )

        visit_info = None
        text_parts = []
        for item in resp.content or []:
            itype = item.get('type') if isinstance(item, dict) else getattr(item, 'type', None)
            if itype == 'text':
                t = item.get('text') if isinstance(item, dict) else getattr(item, 'text', None)
                if isinstance(t, str):
                    text_parts.append(t)
            elif itype == 'web_search_tool_result':
                visit_info = item
        text = '\n\n'.join(text_parts) if text_parts else (getattr(resp, 'output_text', '') or '')

        conversation_id = None
        if bool(data.get('persist', True)):
            try:
                tenant_id = data.get('tenant_id')
                if not tenant_id:
                    user_tenants = supabase.table('tenant_users').select('tenant_id').eq('user_id', request.user_id).limit(1).execute()
                    if user_tenants.data:
                        tenant_id = user_tenants.data[0]['tenant_id']
                titulo = (url[:60] + '...') if len(url) > 60 else url
                conv_res = supabase.table('conversations').insert({
                    'tenant_id': tenant_id,
                    'user_id': request.user_id,
                    'titulo': titulo
                }).execute()
                conversation_id = conv_res.data[0]['id']
                supabase.table('messages').insert({
                    'conversation_id': conversation_id,
                    'role': 'user',
                    'content': content
                }).execute()
                fonte_md = f"\n\nFonte:\n- {url}"
                supabase.table('messages').insert({
                    'conversation_id': conversation_id,
                    'role': 'assistant',
                    'content': (text or '') + fonte_md
                }).execute()
            except Exception as persist_err:
                print(f"Erro ao persistir visita web: {persist_err}")

        return jsonify({'answer': text, 'visit_info': visit_info, 'conversation_id': conversation_id}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500