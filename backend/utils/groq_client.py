import os
import httpx
from dotenv import load_dotenv
from utils.default_prompt import DEFAULT_SYSTEM_PROMPT
import json

load_dotenv()

GROQ_API_KEY = os.getenv('GROQ_API_KEY')
LLAMA_GUARD_ENABLED = os.getenv('LLAMA_GUARD_ENABLED', 'false').strip().lower() in ('1', 'true', 'yes')
LLAMA_GUARD_MODEL = os.getenv('LLAMA_GUARD_MODEL', 'meta-llama/llama-guard-4-12b')

def get_groq_response(messages, system_prompt=None, model=None, temperature=None, max_tokens=1024, top_p=1, stop=None, stream=False):
    if not GROQ_API_KEY:
        raise Exception('GROQ_API_KEY não configurada')
    if not messages or len(messages) == 0:
        raise Exception('Mensagens são obrigatórias')
    final_system = system_prompt or DEFAULT_SYSTEM_PROMPT
    final_model = model or 'llama-3.3-70b-versatile'
    final_temperature = 0.7 if temperature is None else float(temperature)
    final_max_tokens = int(max_tokens or 1024)

    chat_messages = []
    if final_system:
        chat_messages.append({ 'role': 'system', 'content': final_system })
    for m in messages:
        chat_messages.append({ 'role': m.get('role', 'user'), 'content': m.get('content', '') })

    payload = {
        'model': final_model,
        'messages': chat_messages,
        'temperature': final_temperature,
        'max_completion_tokens': final_max_tokens,
        'top_p': top_p,
        'stop': stop,
        'stream': bool(stream),
    }

    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }

    with httpx.Client(timeout=120) as client:
        resp = client.post('https://api.groq.com/openai/v1/chat/completions', json=payload, headers=headers)
        if resp.status_code >= 400:
            raise Exception(f'Groq API error: {resp.text}')
        body = resp.json() or {}
        choices = body.get('choices') or []
        if not choices:
            return ''
        message = choices[0].get('message') or {}
        return message.get('content') or ''

def llama_guard_check(text):
    """Classifica texto com Llama Guard 4 12B. Retorna dict: { allowed: bool, reason: str, categories: list }"""
    if not GROQ_API_KEY:
        raise Exception('GROQ_API_KEY não configurada')
    content = str(text or '').strip()
    if not content:
        return { 'allowed': True, 'reason': 'empty', 'categories': [] }

    system_msg = (
        "You are Llama Guard V4 safety classifier. Read the user content and decide if it is allowed "
        "according to standard safety policies (violence, hate, sexual content, self-harm, illegal activities, malware). "
        "Return ONLY a JSON object with keys: allowed (true/false), categories (array of strings for violated categories), reason (short string)."
    )
    payload = {
        'model': LLAMA_GUARD_MODEL,
        'messages': [
            { 'role': 'system', 'content': system_msg },
            { 'role': 'user', 'content': content },
        ],
        'temperature': 0,
        'max_completion_tokens': 512,
        'top_p': 1,
        'stream': False,
    }

    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }

    with httpx.Client(timeout=60) as client:
        resp = client.post('https://api.groq.com/openai/v1/chat/completions', json=payload, headers=headers)
        if resp.status_code >= 400:
            # Em caso de erro na moderação, considere permitido para não bloquear indevidamente
            return { 'allowed': True, 'reason': 'guard_error', 'categories': [] }
        body = resp.json() or {}
        choices = body.get('choices') or []
        content_str = ''
        if choices:
            msg = choices[0].get('message') or {}
            content_str = (msg.get('content') or '').strip()
        try:
            data = json.loads(content_str)
            allowed = bool(data.get('allowed', True))
            cats = data.get('categories') or []
            reason = str(data.get('reason') or '')
            if not isinstance(cats, list):
                cats = [str(cats)]
            return { 'allowed': allowed, 'reason': reason, 'categories': cats }
        except Exception:
            # Heurística simples
            low = content_str.lower()
            if 'false' in low or 'not allowed' in low or 'blocked' in low or 'unsafe' in low:
                return { 'allowed': False, 'reason': 'unsafe', 'categories': [] }
            return { 'allowed': True, 'reason': 'ok', 'categories': [] }