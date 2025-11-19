import { useCallback } from 'react'
import { useNotification } from './useNotification'

/**
 * Hook para tratamento centralizado de erros da API
 * Mapeia os códigos de erro do backend para mensagens amigáveis
 */
export const useErrorHandler = () => {
  const { showError, showWarning } = useNotification()

  const ERROR_MESSAGES = {
    // Erros de validação
    VALIDATION_ERROR: 'Dados inválidos. Verifique os campos e tente novamente.',

    // Erros de autenticação
    AUTHENTICATION_ERROR: 'Sua sessão expirou. Faça login novamente.',
    UNAUTHORIZED: 'Você não tem permissão para realizar esta ação.',

    // Erros de recursos
    NOT_FOUND: 'Recurso não encontrado.',
    CONFLICT: 'Este recurso já existe.',

    // Erros de quota
    QUOTA_EXCEEDED: 'Você atingiu o limite diário do seu plano. Faça upgrade para continuar.',

    // Erros de rate limiting
    RATE_LIMIT_EXCEEDED: 'Muitas requisições. Aguarde um momento e tente novamente.',

    // Erros de SSRF
    SSRF_ERROR: 'URL não permitida por motivos de segurança.',

    // Erros internos
    INTERNAL_ERROR: 'Erro interno do servidor. Tente novamente mais tarde.',
    DATABASE_ERROR: 'Erro ao acessar o banco de dados. Tente novamente.',
  }

  const handleError = useCallback((error) => {
    // Se não houver resposta do servidor
    if (!error.response) {
      showError('Erro de conexão. Verifique sua internet e tente novamente.')
      return {
        code: 'NETWORK_ERROR',
        message: 'Erro de conexão',
        status: 0
      }
    }

    const { status, data } = error.response
    const errorCode = data?.code || 'UNKNOWN_ERROR'
    const errorMessage = data?.error || data?.message
    const errorDetails = data?.details

    // Tratamento especial para erros de autenticação
    if (status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      showWarning('Sessão expirada. Redirecionando para login...')
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
      return {
        code: errorCode,
        message: errorMessage,
        status,
        details: errorDetails
      }
    }

    // Tratamento para rate limiting (429)
    if (status === 429) {
      const retryAfter = error.response.headers['retry-after']
      const message = retryAfter
        ? `Limite excedido. Tente novamente em ${retryAfter} segundos.`
        : ERROR_MESSAGES.RATE_LIMIT_EXCEEDED
      showWarning(message)
      return {
        code: errorCode,
        message,
        status,
        retryAfter
      }
    }

    // Tratamento para quota excedida
    if (errorCode === 'QUOTA_EXCEEDED') {
      showError(errorMessage || ERROR_MESSAGES.QUOTA_EXCEEDED)
      return {
        code: errorCode,
        message: errorMessage || ERROR_MESSAGES.QUOTA_EXCEEDED,
        status,
        details: errorDetails
      }
    }

    // Tratamento para erros de validação
    if (errorCode === 'VALIDATION_ERROR' && errorDetails) {
      // Formata os erros de validação do Pydantic
      const validationErrors = Array.isArray(errorDetails)
        ? errorDetails.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ')
        : errorMessage

      showError(validationErrors || ERROR_MESSAGES.VALIDATION_ERROR)
      return {
        code: errorCode,
        message: validationErrors,
        status,
        details: errorDetails
      }
    }

    // Mensagem genérica baseada no código de erro
    const message = errorMessage || ERROR_MESSAGES[errorCode] || 'Erro desconhecido'
    showError(message)

    return {
      code: errorCode,
      message,
      status,
      details: errorDetails
    }
  }, [showError, showWarning])

  return { handleError }
}
