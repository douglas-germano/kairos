import os
import google.generativeai as genai
from dotenv import load_dotenv
from utils.default_prompt import DEFAULT_SYSTEM_PROMPT

load_dotenv()

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')

if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY deve estar definida no arquivo .env")

genai.configure(api_key=GOOGLE_API_KEY)

# Configurações de segurança padrão
SAFETY_SETTINGS = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_MEDIUM_AND_ABOVE"
    },
]

def get_google_response(messages, system_prompt=None, model=None, temperature=None, max_tokens=2048):
    """
    Envia mensagens para o Google Gemini e retorna a resposta
    """
    try:
        final_model = model or 'gemini-1.5-pro'
        
        # Mapear nome do modelo se necessário (caso venha do frontend com nome diferente)
        if final_model == 'gemini-1.5-pro':
            final_model = 'gemini-1.5-pro'
        elif final_model == 'gemini-1.5-flash':
            final_model = 'gemini-1.5-flash'
            
        generation_config = {
            "temperature": temperature if temperature is not None else 0.7,
            "top_p": 0.95,
            "top_k": 64,
            "max_output_tokens": max_tokens,
            "response_mime_type": "text/plain",
        }

        # Configurar prompt do sistema
        final_system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
        
        model_instance = genai.GenerativeModel(
            model_name=final_model,
            generation_config=generation_config,
            system_instruction=final_system_prompt,
            safety_settings=SAFETY_SETTINGS
        )

        # Converter histórico de mensagens para o formato do Gemini
        # Gemini usa: [{'role': 'user', 'parts': ['text']}, {'role': 'model', 'parts': ['text']}]
        history = []
        last_user_message = ""
        
        for msg in messages:
            role = msg.get('role')
            content = msg.get('content', '')
            
            if role == 'user':
                # Se for a última mensagem, guardamos para enviar no send_message
                if msg == messages[-1]:
                    last_user_message = content
                else:
                    history.append({'role': 'user', 'parts': [content]})
            elif role == 'assistant':
                history.append({'role': 'model', 'parts': [content]})
        
        # Iniciar chat com histórico (exceto a última mensagem)
        chat_session = model_instance.start_chat(
            history=history
        )

        # Enviar a última mensagem
        response = chat_session.send_message(last_user_message)
        
        return response.text

    except Exception as e:
        raise Exception(f"Erro ao comunicar com Google Gemini: {str(e)}")

def generate_image_with_google(prompt, width=1024, height=1024):
    """
    Gera imagem usando Google Imagen (Nano Banana)
    """
    try:
        # Nota: O SDK do Google Generative AI para Python tem suporte a Imagen
        # Mas a API exata pode variar. Vamos usar o padrão mais recente.
        # Se o modelo 'imagen-3.0-generate-001' estiver disponível.
        
        # Para simplificar e garantir compatibilidade, vamos assumir que o usuário
        # tem acesso ao modelo de imagem.
        
        # Exemplo de uso (hipotético, ajustado para o SDK comum):
        # model = genai.GenerativeModel('imagen-3.0-generate-001')
        # result = model.generate_images(prompt=prompt, number_of_images=1)
        
        # Como o SDK pode não ter essa função exposta diretamente em todas as versões,
        # ou pode exigir uma chamada REST direta se o SDK estiver desatualizado.
        # Vamos tentar usar o SDK se possível, ou fallback.
        
        # VERIFICAÇÃO: O SDK google-generativeai atual (v0.8.x) suporta isso?
        # A documentação sugere que sim para alguns modelos.
        
        # Vamos tentar instanciar o modelo de imagem
        # model = genai.ImageGenerationModel("imagen-3.0-generate-001") # Classe pode não existir no SDK padrão
        
        # Abordagem alternativa: Usar o endpoint REST se o SDK falhar ou não tiver o método.
        # Mas vamos tentar o método do SDK primeiro se soubermos a assinatura.
        
        # Dado que não tenho certeza absoluta da assinatura do SDK instalado (0.8.5),
        # vou usar uma implementação segura que tenta importar ou usa REST.
        
        # ATUALIZAÇÃO: O SDK 0.8.5 não tem 'ImageGenerationModel' exposto no topo geralmente.
        # Mas vamos tentar usar o genai.GenerativeModel se ele suportar saida de imagem.
        # Gemini 1.5 Pro não gera imagens nativamente via SDK de chat.
        
        # Se o usuário quer "Nano Banana" (Imagen 3), isso geralmente é via Vertex AI ou AI Studio.
        # No AI Studio (API Key), o suporte a imagem é limitado ou beta.
        
        # Vou implementar um placeholder que tenta usar o SDK, e se falhar, retorna erro explicativo.
        # Mas o usuário deu uma API Key que funciona.
        
        # TENTATIVA: Usar o modelo 'gemini-1.5-pro' para pedir uma descrição de imagem? Não, ele quer a imagem.
        
        # Vamos assumir que a API suporta e usar o cliente.
        # Se não, teremos que avisar.
        pass
        
        # Implementação real (baseada em docs recentes):
        # Atualmente (Nov 2025), a API do Google AI Studio suporta geração de imagens via REST
        # POST https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict
        
        import requests
        
        # Usando o modelo 'imagen-4.0-fast-generate-001' que está disponível na lista
        model_name = 'imagen-4.0-fast-generate-001'
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:predict?key={GOOGLE_API_KEY}"
        
        headers = {
            "Content-Type": "application/json"
        }
        
        payload = {
            "instances": [
                {
                    "prompt": prompt
                }
            ],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": "1:1" if width == height else ("16:9" if width > height else "9:16"),
                # "personGeneration": "allow_adult" # Cuidado com filtros
            }
        }
        
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code != 200:
            # Tentar outro modelo se o fast falhar
            if "not found" in response.text.lower():
                 model_name = 'imagen-4.0-generate-001'
                 url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:predict?key={GOOGLE_API_KEY}"
                 response = requests.post(url, headers=headers, json=payload)
                 
            if response.status_code != 200:
                raise Exception(f"Erro na API do Google ({model_name}): {response.text}")
            
        result = response.json()
        
        # Extrair imagem (vem em base64)
        predictions = result.get('predictions')
        if not predictions:
            raise Exception("Nenhuma imagem gerada")
            
        b64_image = predictions[0].get('bytesBase64Encoded')
        mime_type = predictions[0].get('mimeType', 'image/png')
        
        return f"data:{mime_type};base64,{b64_image}"

    except Exception as e:
        raise Exception(f"Erro ao gerar imagem com Google: {str(e)}")
