from datetime import datetime, date
from typing import Dict
from config.supabase_config import supabase
from models.exceptions import QuotaExceededError
import logging

logger = logging.getLogger(__name__)

class QuotaManager:
    """Gerenciador de quotas por tenant e plano"""

    LIMITS_BY_PLAN = {
        'free': {
            'api_calls_per_day': 100,
            'conversations': 10,
            'custom_ais': 2,
            'projects': 5,
            'swipes': 50,
            'messages_per_conversation': 50,
        },
        'pro': {
            'api_calls_per_day': 10000,
            'conversations': 1000,
            'custom_ais': 50,
            'projects': 100,
            'swipes': 5000,
            'messages_per_conversation': 5000,
        },
        'enterprise': {
            'api_calls_per_day': 999999,
            'conversations': 999999,
            'custom_ais': 999999,
            'projects': 999999,
            'swipes': 999999,
            'messages_per_conversation': 999999,
        }
    }

    @classmethod
    def get_tenant_plan(cls, tenant_id: str) -> str:
        """Obtém o plano do tenant"""
        try:
            result = supabase.table('tenants') \
                .select('plano') \
                .eq('id', tenant_id) \
                .limit(1) \
                .execute()

            if not result.data:
                logger.warning(f'Tenant {tenant_id} not found')
                return 'free'

            return result.data[0].get('plano', 'free')
        except Exception as e:
            logger.error(f'Error getting tenant plan: {str(e)}')
            return 'free'

    @classmethod
    def check_quota(cls, tenant_id: str, action: str) -> bool:
        """
        Verifica se tenant pode realizar ação.

        Args:
            tenant_id: ID do tenant
            action: Ação a verificar (ex: 'api_calls_per_day')

        Returns:
            True se dentro do limite, False caso contrário

        Raises:
            QuotaExceededError se limite excedido
        """
        plan = cls.get_tenant_plan(tenant_id)
        limit = cls.LIMITS_BY_PLAN.get(plan, {}).get(action, 100)

        # Contar uso hoje
        today = date.today().isoformat()

        try:
            result = supabase.table('quota_logs') \
                .select('count', count='exact') \
                .eq('tenant_id', tenant_id) \
                .eq('action', action) \
                .gte('created_at', f'{today}T00:00:00') \
                .execute()

            usage = result.count or 0

            if usage >= limit:
                logger.warning(
                    f'Quota exceeded for {tenant_id}: {action}',
                    extra={'usage': usage, 'limit': limit}
                )
                raise QuotaExceededError()

            return True

        except QuotaExceededError:
            raise
        except Exception as e:
            logger.error(f'Error checking quota: {str(e)}')
            return True  # Permitir em caso de erro

    @classmethod
    def log_usage(cls, tenant_id: str, action: str, user_id: str) -> None:
        """
        Registra uso de quota.
        """
        try:
            supabase.table('quota_logs').insert({
                'tenant_id': tenant_id,
                'user_id': user_id,
                'action': action,
                'created_at': datetime.now().isoformat()
            }).execute()
        except Exception as e:
            logger.error(f'Error logging quota: {str(e)}')

    @classmethod
    def get_usage_stats(cls, tenant_id: str) -> Dict:
        """
        Obtém estatísticas de uso do tenant.
        """
        plan = cls.get_tenant_plan(tenant_id)
        limits = cls.LIMITS_BY_PLAN.get(plan, {})
        
        today = date.today().isoformat()
        stats = {
            'plan': plan,
            'usage': {},
            'limits': limits
        }

        try:
            # Buscar uso de todas as ações hoje
            result = supabase.table('quota_logs') \
                .select('action') \
                .eq('tenant_id', tenant_id) \
                .gte('created_at', f'{today}T00:00:00') \
                .execute()

            # Contar ocorrências por ação
            usage_counts = {}
            if result.data:
                for log in result.data:
                    action = log['action']
                    usage_counts[action] = usage_counts.get(action, 0) + 1

            stats['usage'] = usage_counts
            return stats

        except Exception as e:
            logger.error(f'Error getting usage stats: {str(e)}')
            return stats
