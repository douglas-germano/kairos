import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class KairosException(Exception):
    """Exceção base para aplicação Kairos"""

    def __init__(
        self,
        message: str,
        error_code: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)

    def to_dict(self) -> dict:
        return {
            'error': self.message,
            'code': self.error_code,
            'details': self.details
        }

class ValidationError(KairosException):
    """Erro de validação de entrada"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(message, 'VALIDATION_ERROR', 400, details)

class AuthenticationError(KairosException):
    """Erro de autenticação"""
    def __init__(self, message: str = 'Não autenticado'):
        super().__init__(message, 'AUTHENTICATION_ERROR', 401)

class AuthorizationError(KairosException):
    """Erro de autorização"""
    def __init__(self, message: str = 'Não autorizado'):
        super().__init__(message, 'AUTHORIZATION_ERROR', 403)

class NotFoundError(KairosException):
    """Recurso não encontrado"""
    def __init__(self, resource: str):
        super().__init__(f'{resource} não encontrado', 'NOT_FOUND', 404)

class ConflictError(KairosException):
    """Conflito de recurso"""
    def __init__(self, message: str):
        super().__init__(message, 'CONFLICT', 409)

class QuotaExceededError(KairosException):
    """Limite de quota excedido"""
    
    ACTION_MESSAGES = {
        'api_calls_per_day': {
            'title': 'Limite de chamadas diárias atingido',
            'message': 'Você atingiu o limite de chamadas de API para hoje. Volte amanhã ou faça upgrade do seu plano para continuar usando.',
        },
        'conversations': {
            'title': 'Limite de conversas diárias atingido',
            'message': 'Você atingiu o limite de novas conversas para hoje. Volte amanhã ou faça upgrade do seu plano para criar mais conversas.',
        },
        'custom_ais': {
            'title': 'Limite de agentes atingido',
            'message': 'Você atingiu o limite de agentes personalizados. Delete um agente existente ou faça upgrade do seu plano para criar mais.',
        },
        'projects': {
            'title': 'Limite de projetos atingido',
            'message': 'Você atingiu o limite de projetos. Delete um projeto existente ou faça upgrade do seu plano para criar mais.',
        },
    }
    
    def __init__(self, action: str = None):
        action_info = self.ACTION_MESSAGES.get(action, {
            'title': 'Limite de quota excedido',
            'message': 'Você atingiu um limite do seu plano. Faça upgrade para continuar usando todos os recursos.'
        })
        
        super().__init__(
            action_info['message'],
            'QUOTA_EXCEEDED',
            429,
            details={
                'title': action_info['title'],
                'action': action,
                'upgrade_url': '/plans'
            }
        )

class RateLimitError(KairosException):
    """Rate limit excedido"""
    def __init__(self):
        super().__init__(
            'Muitas requisições. Tente novamente em alguns segundos.',
            'RATE_LIMIT',
            429
        )

class SSRFError(KairosException):
    """Tentativa de SSRF bloqueada"""
    def __init__(self):
        super().__init__(
            'URL não permitida por motivos de segurança',
            'SSRF_BLOCKED',
            400
        )

class InternalError(KairosException):
    """Erro interno do servidor"""
    def __init__(self, message: str = 'Erro interno do servidor'):
        super().__init__(message, 'INTERNAL_ERROR', 500)
