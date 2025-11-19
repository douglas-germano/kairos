import os
from anthropic import Anthropic
from dotenv import load_dotenv
from utils.default_prompt import DEFAULT_SYSTEM_PROMPT
from config.supabase_config import supabase

load_dotenv()

ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY deve estar definida no arquivo .env")

client = Anthropic(api_key=ANTHROPIC_API_KEY, default_headers={"anthropic-beta": "context-management-2025-06-27"})


MODEL_OPTIONS = [
    "claude-sonnet-4-5",
    "claude-opus-4-1",
]

MEM_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "memories"))

def ensure_mem_root():
    try:
        os.makedirs(MEM_ROOT, exist_ok=True)
    except Exception:
        pass

def resolve_mem_path(path):
    ensure_mem_root()
    p = str(path or "").strip()
    if p.startswith("/memories"):
        p = p[len("/memories"):]
    p = p.lstrip("/")
    abspath = os.path.abspath(os.path.join(MEM_ROOT, p))
    if not abspath.startswith(MEM_ROOT):
        raise ValueError("Caminho inválido")
    return abspath

def memory_view(input_obj):
    path = resolve_mem_path(input_obj.get("path"))
    view_range = input_obj.get("view_range")
    if not os.path.exists(path):
        return "Arquivo ou diretório não existe"
    if os.path.isdir(path):
        items = sorted(os.listdir(path))
        return "Directory: /memories" + ("/" + os.path.relpath(path, MEM_ROOT) if os.path.relpath(path, MEM_ROOT) != "." else "") + "\n" + "\n".join(["- " + i for i in items])
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.read().splitlines()
    if isinstance(view_range, list) and len(view_range) == 2:
        s = max(1, int(view_range[0]))
        e = max(s, int(view_range[1]))
        sel = lines[s-1:e]
        return "\n".join(sel)
    return "\n".join(lines)

def memory_create(input_obj):
    path = resolve_mem_path(input_obj.get("path"))
    text = input_obj.get("file_text") or ""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return "OK"

def memory_str_replace(input_obj):
    path = resolve_mem_path(input_obj.get("path"))
    old_str = input_obj.get("old_str") or ""
    new_str = input_obj.get("new_str") or ""
    if not os.path.exists(path) or os.path.isdir(path):
        return "Arquivo não encontrado"
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
    content = content.replace(old_str, new_str)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return "OK"

def memory_insert(input_obj):
    path = resolve_mem_path(input_obj.get("path"))
    insert_line = int(input_obj.get("insert_line") or 1)
    insert_text = input_obj.get("insert_text") or ""
    if not os.path.exists(path) or os.path.isdir(path):
        return "Arquivo não encontrado"
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.read().splitlines()
    idx = max(0, insert_line - 1)
    lines[idx:idx] = [insert_text]
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return "OK"

def memory_delete(input_obj):
    path = resolve_mem_path(input_obj.get("path"))
    if not os.path.exists(path):
        return "OK"
    if os.path.isdir(path):
        for root, dirs, files in os.walk(path, topdown=False):
            for name in files:
                try:
                    os.remove(os.path.join(root, name))
                except Exception:
                    pass
            for name in dirs:
                try:
                    os.rmdir(os.path.join(root, name))
                except Exception:
                    pass
        try:
            os.rmdir(path)
        except Exception:
            pass
    else:
        try:
            os.remove(path)
        except Exception:
            pass
    return "OK"

def memory_rename(input_obj):
    old_path = resolve_mem_path(input_obj.get("old_path"))
    new_path = resolve_mem_path(input_obj.get("new_path"))
    os.makedirs(os.path.dirname(new_path), exist_ok=True)
    try:
        os.replace(old_path, new_path)
        return "OK"
    except Exception:
        return "Falha ao renomear"

def execute_memory_tool(input_obj):
    cmd = str(input_obj.get("command") or "").strip()
    if cmd == "view":
        return memory_view(input_obj)
    if cmd == "create":
        return memory_create(input_obj)
    if cmd == "str_replace":
        return memory_str_replace(input_obj)
    if cmd == "insert":
        return memory_insert(input_obj)
    if cmd == "delete":
        return memory_delete(input_obj)
    if cmd == "rename":
        return memory_rename(input_obj)
    return "Comando inválido"

def get_custom_ai_config(custom_ai_id):
    """
    Busca configuração de IA personalizada no Supabase
    
    Args:
        custom_ai_id: ID da IA personalizada
    
    Returns:
        Dicionário com configurações da IA ou None
    """
    try:
        result = supabase.table('custom_ais').select('*').eq('id', custom_ai_id).execute()
        if result.data:
            return result.data[0]
        return None
    except Exception as e:
        print(f"Erro ao buscar IA personalizada: {str(e)}")
        return None

def get_claude_response(messages, system_prompt=None, custom_ai_id=None, model=None, temperature=None, max_tokens=4096):
    """
    Envia mensagens para Claude e retorna a resposta
    
    Args:
        messages: Lista de mensagens no formato [{"role": "user", "content": "..."}]
        system_prompt: Prompt do sistema (opcional)
        custom_ai_id: ID da IA personalizada (opcional)
        model: Modelo a usar (opcional, usa primeiro disponível se não especificar)
        temperature: Temperatura da resposta (0-1)
        max_tokens: Máximo de tokens na resposta
    
    Returns:
        Resposta do Claude como string
    
    Raises:
        Exception: Se houver erro na comunicação com Claude
    """
    try:
        # Validar mensagens
        if not messages or len(messages) == 0:
            raise ValueError("É necessário pelo menos uma mensagem")
        
        # Formatar mensagens
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Se custom_ai_id fornecido, buscar configurações
        if custom_ai_id:
            custom_ai = get_custom_ai_config(custom_ai_id)
            if custom_ai:
                system_prompt = custom_ai.get('sistema_prompt', DEFAULT_SYSTEM_PROMPT)
                model = model or custom_ai.get('modelo', 'claude-opus-4-1')
                temperature = temperature if temperature is not None else custom_ai.get('temperatura', 0.7)
                max_tokens = max_tokens if max_tokens != 4096 else custom_ai.get('max_tokens', 2048)
        
        # Usar prompt padrão se nenhum fornecido
        final_system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        final_temperature = temperature if temperature is not None else 0.7
        final_max_tokens = max_tokens
        final_model = model
        
        # Se modelo específico fornecido, usar somente esse
        models_to_try = [final_model] if final_model else MODEL_OPTIONS
        
        last_error = None
        
        for model_name in models_to_try:
            try:
                params = {
                    "model": model_name,
                    "max_tokens": final_max_tokens,
                    "temperature": final_temperature,
                    "messages": formatted_messages,
                    "system": final_system_prompt,
                    "tools": [{"type": "memory_20250818", "name": "memory"}],
                }

                response = client.messages.create(**params)

                has_tool = False
                tool_results = []
                for item in response.content or []:
                    if hasattr(item, "type") and item.type == "tool_use" and getattr(item, "name", "") == "memory":
                        has_tool = True
                        res = execute_memory_tool(getattr(item, "input", {}) or {})
                        tool_results.append({
                            "role": "user",
                            "content": [{
                                "type": "tool_result",
                                "tool_use_id": getattr(item, "id", ""),
                                "content": res
                            }]
                        })

                if has_tool and tool_results:
                    follow_messages = formatted_messages + [{"role": "assistant", "content": response.content}] + tool_results
                    follow = client.messages.create(
                        model=model_name,
                        max_tokens=final_max_tokens,
                        temperature=final_temperature,
                        messages=follow_messages,
                        system=final_system_prompt,
                        tools=[{"type": "memory_20250818", "name": "memory"}],
                    )
                    parts = []
                    for it in follow.content or []:
                        if hasattr(it, "type") and it.type == "text":
                            parts.append(getattr(it, "text", "") or "")
                    if parts:
                        return "\n\n".join(parts)

                parts = []
                for it in response.content or []:
                    if hasattr(it, "type") and it.type == "text":
                        parts.append(getattr(it, "text", "") or "")
                if parts:
                    return "\n\n".join(parts)
                return "Desculpe, não consegui gerar uma resposta."
                    
            except Exception as model_error:
                error_str = str(model_error)

                # Se erro for de modelo não encontrado ou erro interno da API, tentar próximo
                if (
                    "not_found_error" in error_str.lower()
                    or "404" in error_str
                    or "model" in error_str.lower()
                    or "internal server error" in error_str.lower()
                    or "api_error" in error_str.lower()
                ):
                    last_error = model_error
                    continue
                else:
                    raise
        
        # Se nenhum modelo funcionou
        if last_error:
            raise Exception(f"Nenhum modelo disponível. Verifique sua conta Anthropic. Último erro: {str(last_error)}")
            
    except Exception as e:
        error_msg = str(e)
        
        # Tratar erros específicos
        if "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
            raise Exception("Erro de autenticação com a API do Claude. Verifique se ANTHROPIC_API_KEY está correta.")
        elif "rate_limit" in error_msg.lower() or "rate limit" in error_msg.lower():
            raise Exception("Limite de requisições excedido. Aguarde alguns minutos.")
        elif "overloaded" in error_msg.lower():
            raise Exception("Servidor Claude sobrecarregado. Tente novamente em alguns minutos.")
        else:
            raise Exception(f"Erro ao comunicar com Claude: {error_msg}")

def get_streaming_response(messages, system_prompt=None, custom_ai_id=None, model=None, temperature=None, max_tokens=4096):
    """
    Envia mensagens para Claude e retorna resposta em streaming
    
    Args:
        messages: Lista de mensagens
        system_prompt: Prompt do sistema
        custom_ai_id: ID da IA personalizada
        model: Modelo a usar
        temperature: Temperatura
        max_tokens: Máximo de tokens
    
    Yields:
        Chunks de texto da resposta
    """
    try:
        if not messages or len(messages) == 0:
            raise ValueError("É necessário pelo menos uma mensagem")
        
        # Formatar mensagens
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Se custom_ai_id fornecido
        if custom_ai_id:
            custom_ai = get_custom_ai_config(custom_ai_id)
            if custom_ai:
                system_prompt = custom_ai.get('sistema_prompt', DEFAULT_SYSTEM_PROMPT)
                model = model or custom_ai.get('modelo', 'claude-opus-4-1')
                temperature = temperature if temperature is not None else custom_ai.get('temperatura', 0.7)
                max_tokens = max_tokens if max_tokens != 4096 else custom_ai.get('max_tokens', 2048)
        
        final_system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        final_temperature = temperature if temperature is not None else 0.7
        final_max_tokens = max_tokens
        final_model = model or MODEL_OPTIONS[0]
        
        with client.messages.stream(
            model=final_model,
            max_tokens=final_max_tokens,
            temperature=final_temperature,
            messages=formatted_messages,
            system=final_system_prompt
        ) as stream:
            for text in stream.text_stream:
                yield text
                
    except Exception as e:
        error_msg = str(e)
        raise Exception(f"Erro ao fazer streaming com Claude: {error_msg}")