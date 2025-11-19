import logging
import json
from datetime import datetime
from pythonjsonlogger import jsonlogger
import sys

def setup_logging(app):
    """Configura logging estruturado para a aplicação"""

    # Remover handlers padrão
    logging.getLogger().handlers = []

    # Criar logger raiz
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)

    # Handler para console (JSON)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    json_formatter = jsonlogger.JsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s',
        timestamp=True
    )
    console_handler.setFormatter(json_formatter)
    logger.addHandler(console_handler)

    # Handler para erros (JSON)
    error_handler = logging.StreamHandler(sys.stderr)
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(json_formatter)
    logger.addHandler(error_handler)

    # Configurar loggers específicos
    logging.getLogger('flask').setLevel(logging.INFO)
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('supabase').setLevel(logging.INFO)

    return logger

class RequestContextFilter(logging.Filter):
    """Adiciona contexto de request ao log"""

    def filter(self, record):
        from flask import request, g

        try:
            record.user_id = getattr(g, 'user_id', None)
            record.tenant_id = getattr(g, 'tenant_id', None)
            record.method = request.method
            record.path = request.path
            record.remote_addr = request.remote_addr
        except RuntimeError:
            # Sem contexto de request
            pass

        return True
