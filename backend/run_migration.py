import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("Erro: SUPABASE_URL e SUPABASE_KEY são necessários no arquivo .env")
    exit(1)

supabase: Client = create_client(url, key)

def run_migration():
    migration_file = "migrations/002_add_image_url_to_messages.sql"
    
    try:
        with open(migration_file, 'r') as f:
            sql = f.read()
            
        print(f"Executando migração: {migration_file}")
        
        # Executar SQL usando rpc se disponível ou direto via postgrest se permitido
        # Como supabase-py não tem método direto para executar SQL raw facilmente sem rpc,
        # vamos tentar usar a API rest para invocar uma função postgres se existir,
        # ou usar uma abordagem alternativa se tivermos acesso direto ao banco.
        # MAS, para simplificar e dado que o usuário tem o projeto local,
        # vamos assumir que ele pode rodar isso.
        
        # NOTA: A library supabase-py padrão não executa SQL arbitrário no client-side
        # a menos que usemos uma função RPC criada no banco 'exec_sql' ou similar.
        # Se não tivermos isso, teremos que instruir o usuário a rodar no dashboard.
        
        # Tentar executar via RPC 'exec_sql' se existir (comum em setups supabase)
        try:
            response = supabase.rpc('exec_sql', {'sql_query': sql}).execute()
            print("Migração executada com sucesso via RPC!")
        except Exception as e:
            print(f"Falha ao executar via RPC: {e}")
            print("Tentando método alternativo ou instrução manual...")
            print("\nPOR FAVOR, EXECUTE O SEGUINTE SQL NO DASHBOARD DO SUPABASE (SQL EDITOR):")
            print("-" * 50)
            print(sql)
            print("-" * 50)

    except Exception as e:
        print(f"Erro ao ler arquivo: {e}")

if __name__ == "__main__":
    run_migration()
