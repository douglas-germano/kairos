import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store para gerenciamento de quotas
 */
const useQuotaStore = create(
  persist(
    (set, get) => ({
      quotaInfo: null,
      isQuotaExceeded: false,
      rateLimitInfo: {},

      // Atualiza informações de quota do tenant
      setQuotaInfo: (info) => set({ quotaInfo: info }),

      // Marca quota como excedida
      setQuotaExceeded: (exceeded) => set({ isQuotaExceeded: exceeded }),

      // Atualiza informações de rate limit de um endpoint
      updateRateLimitInfo: (endpoint, info) =>
        set((state) => ({
          rateLimitInfo: {
            ...state.rateLimitInfo,
            [endpoint]: {
              limit: info.limit,
              remaining: info.remaining,
              reset: info.reset,
              timestamp: Date.now()
            }
          }
        })),

      // Verifica se um endpoint está em rate limit
      isEndpointRateLimited: (endpoint) => {
        const info = get().rateLimitInfo[endpoint]
        if (!info) return false

        // Se reset time já passou, não está mais limitado
        if (info.reset && Date.now() > info.reset * 1000) {
          return false
        }

        return info.remaining === 0
      },

      // Retorna tempo restante até reset (em segundos)
      getTimeUntilReset: (endpoint) => {
        const info = get().rateLimitInfo[endpoint]
        if (!info || !info.reset) return 0

        const now = Math.floor(Date.now() / 1000)
        const timeLeft = info.reset - now
        return Math.max(0, timeLeft)
      },

      // Limpa informações de rate limit
      clearRateLimitInfo: () => set({ rateLimitInfo: {} }),

      // Reset completo
      reset: () => set({
        quotaInfo: null,
        isQuotaExceeded: false,
        rateLimitInfo: {}
      })
    }),
    {
      name: 'kairos-quota-storage',
      partialize: (state) => ({
        quotaInfo: state.quotaInfo,
        isQuotaExceeded: state.isQuotaExceeded
      })
    }
  )
)

/**
 * Hook para gerenciar quotas
 */
export const useQuota = () => {
  const {
    quotaInfo,
    isQuotaExceeded,
    rateLimitInfo,
    setQuotaInfo,
    setQuotaExceeded,
    updateRateLimitInfo,
    isEndpointRateLimited,
    getTimeUntilReset,
    clearRateLimitInfo,
    reset
  } = useQuotaStore()

  // Calcula percentual de uso da quota
  const getQuotaPercentage = (action = 'api_calls_per_day') => {
    if (!quotaInfo) return 0

    const usage = quotaInfo.usage?.[action] || 0
    const limit = quotaInfo.limits?.[action] || 100

    return Math.min(100, (usage / limit) * 100)
  }

  // Verifica se está próximo do limite (>= 80%)
  const isNearLimit = (action = 'api_calls_per_day') => {
    return getQuotaPercentage(action) >= 80
  }

  // Retorna informações formatadas de quota
  const getQuotaStatus = (action = 'api_calls_per_day') => {
    if (!quotaInfo) {
      return {
        usage: 0,
        limit: 100,
        remaining: 100,
        percentage: 0,
        plan: 'free'
      }
    }

    const usage = quotaInfo.usage?.[action] || 0
    const limit = quotaInfo.limits?.[action] || 100
    const remaining = Math.max(0, limit - usage)
    const percentage = getQuotaPercentage(action)

    return {
      usage,
      limit,
      remaining,
      percentage,
      plan: quotaInfo.plan || 'free'
    }
  }

  return {
    // State
    quotaInfo,
    isQuotaExceeded,
    rateLimitInfo,

    // Actions
    setQuotaInfo,
    setQuotaExceeded,
    updateRateLimitInfo,
    clearRateLimitInfo,
    reset,

    // Computed
    getQuotaPercentage,
    isNearLimit,
    getQuotaStatus,
    isEndpointRateLimited,
    getTimeUntilReset
  }
}
