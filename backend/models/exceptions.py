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
    def __init__(self):
        super().__init__(
            'Limite de quota diária excedido',
            'QUOTA_EXCEEDED',
            429
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
