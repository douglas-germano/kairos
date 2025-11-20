import os
import resend
import logging

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv()

def send_recovery_email(to_email, code):
    """
    Envia email de recuperação de senha com o código.
    
    Args:
        to_email (str): Email do destinatário.
        code (str): Código de 6 dígitos.
        
    Returns:
        bool: True se enviado com sucesso, False caso contrário.
    """
    api_key = os.getenv('RESEND_API_KEY')
    if not api_key:
        # Tentar carregar novamente caso tenha sido setado após import
        load_dotenv()
        api_key = os.getenv('RESEND_API_KEY')

    if not api_key:
        logger.error("RESEND_API_KEY não configurada no ambiente")
        return False
    
    resend.api_key = api_key
        
    try:
        params = {
            "from": "KAIROS <onboarding@resend.dev>", # Alterar para domínio verificado em produção
            "to": [to_email],
            "subject": "Recuperação de Senha - KAIROS",
            "html": f"""
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Recuperação de Senha</h2>
                <p>Você solicitou a recuperação de senha para sua conta no KAIROS.</p>
                <p>Seu código de verificação é:</p>
                <div style="background-color: #f4f4f5; padding: 20px; text-align: center; border-radius: 8px; font-size: 24px; letter-spacing: 5px; font-weight: bold;">
                    {code}
                </div>
                <p>Este código expira em 15 minutos.</p>
                <p>Se você não solicitou isso, ignore este email.</p>
            </div>
            """
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Email de recuperação enviado para {to_email}: {email}")
        return True
        
    except Exception as e:
        logger.error(f"Erro ao enviar email para {to_email}: {str(e)}")
        return False
