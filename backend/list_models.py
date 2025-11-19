import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
genai.configure(api_key=GOOGLE_API_KEY)

print("Listando modelos disponíveis...")
try:
    for m in genai.list_models():
        print(f"Name: {m.name}")
        print(f"Supported generation methods: {m.supported_generation_methods}")
        print("-" * 20)
except Exception as e:
    print(f"Erro ao listar modelos: {e}")
