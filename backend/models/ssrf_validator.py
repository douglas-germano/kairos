from urllib.parse import urlparse
import ipaddress
import logging

logger = logging.getLogger(__name__)

class SSRFValidator:
    """Validador de URLs para prevenir SSRF attacks"""

    BLOCKED_IPS = {
        '127.0.0.1',
        'localhost',
        '0.0.0.0',
        '::1',
        '169.254.169.254',  # AWS metadata
    }

    ALLOWED_SCHEMES = {'http', 'https'}

    BLOCKED_SCHEMES = {'file', 'gopher', 'dict', 'ldap', 'tftp', 'data'}

    @classmethod
    def is_safe_url(cls, url: str) -> bool:
        """
        Valida se uma URL é segura contra SSRF.

        Args:
            url: URL a validar

        Returns:
            True se segura, False caso contrário
        """
        try:
            parsed = urlparse(url)

            # 1. Validar scheme
            if parsed.scheme not in cls.ALLOWED_SCHEMES:
                logger.warning(f'Blocked scheme: {parsed.scheme}')
                return False

            # 2. Validar hostname existe
            hostname = parsed.hostname
            if not hostname:
                logger.warning('No hostname in URL')
                return False

            # 3. Rejeitar IPs bloqueados
            if hostname.lower() in cls.BLOCKED_IPS:
                logger.warning(f'Blocked IP: {hostname}')
                return False

            # 4. Rejeitar IPs privados
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local:
                    logger.warning(f'Private IP: {hostname}')
                    return False
            except ValueError:
                # Não é IP, é domínio - continuar validação
                pass

            # 5. Validar TLD válido (domínios devem ter ponto)
            if '.' not in hostname:
                logger.warning(f'Invalid hostname: {hostname}')
                return False

            return True

        except Exception as e:
            logger.error(f'SSRF validation error: {str(e)}')
            return False
