import logging
from utils.google_client import get_google_response

logger = logging.getLogger(__name__)

def generate_conversation_title(messages):
    """
    Gera um título curto e descritivo para a conversa usando o modelo Gemini Flash.
    
    Args:
        messages (list): Lista de mensagens da conversa.
        
    Returns:
        str: Título gerado ou None se falhar.
    """
    try:
        # Preparar prompt específico para sumarização
        prompt = """
        Analise a conversa abaixo e gere um título curto, descritivo e relevante (3-5 palavras) em Português.
        O título deve capturar a essência do tópico principal.
        NÃO use aspas, NÃO use prefixos como "Título:", apenas o texto do título.
        
        Conversa:
        """
        
        # Usar apenas as primeiras mensagens para o contexto
        context_messages = messages[:4]
        
        for msg in context_messages:
            role = "Usuário" if msg.get("role") == "user" else "Assistente"
            content = msg.get("content", "")
            prompt += f"\n{role}: {content}"
            
        # Chamada direta ao modelo Flash para rapidez e baixo custo
        response = get_google_response(
            messages=[{"role": "user", "content": prompt}],
            model="gemini-1.5-flash"
        )
        
        # Limpar resposta
        title = response.strip().replace('"', '').replace("'", "")
        
        # Garantir que não é muito longo
        if len(title) > 50:
            title = title[:47] + "..."
            
        return title
        
    except Exception as e:
        logger.error(f"Erro ao gerar título da conversa: {str(e)}")
        return None
