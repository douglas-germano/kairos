import { useQuota } from '../hooks/useQuota'
import { TrendingUp, AlertCircle } from 'lucide-react'

/**
 * Componente para exibir indicador de quota
 */
export const QuotaIndicator = ({ action = 'api_calls_per_day', showDetails = true }) => {
  const { getQuotaStatus, isNearLimit, isQuotaExceeded } = useQuota()
  const status = getQuotaStatus(action)

  if (!status || status.limit === 0) return null

  // Cores baseadas no percentual de uso
  const getColorClass = () => {
    if (isQuotaExceeded || status.percentage >= 100) return 'text-red-600 bg-red-100'
    if (isNearLimit(action)) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const getProgressColor = () => {
    if (isQuotaExceeded || status.percentage >= 100) return 'bg-red-500'
    if (isNearLimit(action)) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="w-full">
      {/* Header com ícone e título */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Uso da API
          </span>
        </div>
        {(isQuotaExceeded || isNearLimit(action)) && (
          <AlertCircle className="w-4 h-4 text-yellow-500" />
        )}
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(100, status.percentage)}%` }}
        />
      </div>

      {/* Detalhes */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {status.usage.toLocaleString()} / {status.limit.toLocaleString()} chamadas
          </span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${getColorClass()}`}>
            {Math.round(status.percentage)}%
          </span>
        </div>
      )}

      {/* Mensagem de alerta */}
      {isQuotaExceeded && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          Limite diário atingido. Aguarde até amanhã ou faça upgrade do plano.
        </div>
      )}

      {isNearLimit(action) && !isQuotaExceeded && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
          Você está próximo do limite diário ({status.remaining} chamadas restantes).
        </div>
      )}
    </div>
  )
}

/**
 * Versão compacta do indicador de quota (para topbar/sidebar)
 */
export const QuotaIndicatorCompact = ({ action = 'api_calls_per_day' }) => {
  const { getQuotaStatus, isQuotaExceeded } = useQuota()
  const status = getQuotaStatus(action)

  if (!status || status.limit === 0) return null

  const getColorClass = () => {
    if (isQuotaExceeded || status.percentage >= 100) return 'bg-red-500'
    if (status.percentage >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getColorClass()}`}
            style={{ width: `${Math.min(100, status.percentage)}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-600 font-medium min-w-[60px] text-right">
        {status.remaining}/{status.limit}
      </span>
    </div>
  )
}
