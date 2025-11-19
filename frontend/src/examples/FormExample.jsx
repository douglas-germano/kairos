/**
 * EXEMPLO DE USO DOS NOVOS HOOKS E COMPONENTES
 *
 * Este arquivo demonstra como usar:
 * - useFormValidation para validação de formulários
 * - useErrorHandler para tratamento de erros
 * - useNotification para notificações
 * - useQuota para gerenciamento de quotas
 * - Componentes de UI (Pagination, QuotaIndicator)
 */

import { useState } from 'react'
import { useFormValidation } from '../hooks/useFormValidation'
import { useErrorHandler } from '../hooks/useErrorHandler'
import { useNotification } from '../hooks/useNotification'
import { useQuota } from '../hooks/useQuota'
import { QuotaIndicator } from '../components/QuotaIndicator'
import { authAPI } from '../services/api'

/**
 * Exemplo: Formulário de Registro
 */
export const RegisterFormExample = () => {
  const { showSuccess } = useNotification()
  const { handleError } = useErrorHandler()
  const { isQuotaExceeded } = useQuota()

  // Configuração do formulário com validações
  const {
    values,
    errors,
    touched,
    isSubmitting,
    validators,
    handleInputChange,
    handleInputBlur,
    handleSubmit
  } = useFormValidation(
    // Valores iniciais
    {
      email: '',
      nome: '',
      password: '',
      confirmPassword: ''
    },
    // Regras de validação
    {
      email: [
        validators.required,
        validators.email
      ],
      nome: [
        validators.required,
        validators.minLength(1),
        validators.maxLength(100),
        validators.pattern(
          /^[a-zA-Z0-9\s]+$/,
          'Nome não pode conter caracteres especiais'
        )
      ],
      password: [
        validators.required,
        validators.minLength(6),
        validators.maxLength(100)
      ],
      confirmPassword: [
        validators.required,
        validators.custom((value) => {
          if (value !== values.password) {
            return 'As senhas não coincidem'
          }
          return null
        })
      ]
    }
  )

  const onSubmit = async (formValues) => {
    try {
      const { confirmPassword, ...data } = formValues
      const response = await authAPI.register(data)
      showSuccess('Cadastro realizado com sucesso!')
      // Redirecionar ou fazer login automático
    } catch (error) {
      handleError(error)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">Criar Conta</h2>

      {/* Indicador de Quota */}
      <div className="mb-6">
        <QuotaIndicator />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            name="email"
            value={values.email}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={isSubmitting || isQuotaExceeded}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              touched.email && errors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="seu@email.com"
          />
          {touched.email && errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Nome */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome *
          </label>
          <input
            type="text"
            name="nome"
            value={values.nome}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={isSubmitting || isQuotaExceeded}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              touched.nome && errors.nome
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="Seu Nome"
            maxLength={100}
          />
          {touched.nome && errors.nome && (
            <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
          )}
        </div>

        {/* Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Senha *
          </label>
          <input
            type="password"
            name="password"
            value={values.password}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={isSubmitting || isQuotaExceeded}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              touched.password && errors.password
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="••••••••"
            maxLength={100}
          />
          {touched.password && errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Mínimo de 6 caracteres
          </p>
        </div>

        {/* Confirmar Senha */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirmar Senha *
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={values.confirmPassword}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={isSubmitting || isQuotaExceeded}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              touched.confirmPassword && errors.confirmPassword
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            } disabled:bg-gray-100 disabled:cursor-not-allowed`}
            placeholder="••••••••"
            maxLength={100}
          />
          {touched.confirmPassword && errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Botão Submit */}
        <button
          type="submit"
          disabled={isSubmitting || isQuotaExceeded}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
        </button>

        {isQuotaExceeded && (
          <p className="text-sm text-red-600 text-center">
            Limite de requisições atingido. Tente novamente mais tarde.
          </p>
        )}
      </form>
    </div>
  )
}

/**
 * Exemplo: Lista com Paginação
 */
export const ListWithPaginationExample = () => {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const { handleError } = useErrorHandler()
  const { showSuccess } = useNotification()

  // Importar o hook de paginação
  // const { currentPage, itemsPerPage, totalItems, handlePageChange, handleItemsPerPageChange, getPaginationParams, updateTotalItems } = usePagination()

  // const fetchItems = async () => {
  //   setLoading(true)
  //   try {
  //     const params = getPaginationParams()
  //     const response = await chatAPI.getConversations(params)
  //     setItems(response.data.items || [])
  //     updateTotalItems(response.data.total || 0)
  //     showSuccess('Conversas carregadas!')
  //   } catch (error) {
  //     handleError(error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  // useEffect(() => {
  //   fetchItems()
  // }, [currentPage, itemsPerPage])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Minhas Conversas</h2>

      {loading ? (
        <div className="text-center py-8">Carregando...</div>
      ) : (
        <>
          {/* Lista de items */}
          <div className="space-y-4 mb-4">
            {items.map((item) => (
              <div key={item.id} className="p-4 bg-white rounded-lg shadow">
                {/* Conteúdo do item */}
              </div>
            ))}
          </div>

          {/* Componente de Paginação */}
          {/* <Pagination
            currentPage={currentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          /> */}
        </>
      )}
    </div>
  )
}

/**
 * Exemplo: Integração com API Events
 */
export const ApiEventsExample = () => {
  // Em um componente de nível superior (App.jsx ou Layout)
  // useEffect(() => {
  //   import('../services/api').then(({ apiEvents }) => {
  //     // Escuta eventos de rate limit
  //     apiEvents.on('rateLimit', ({ endpoint, limit, remaining }) => {
  //       console.log(`Rate limit: ${remaining}/${limit} para ${endpoint}`)
  //     })
  //
  //     // Escuta quando rate limit é excedido
  //     apiEvents.on('rateLimitExceeded', ({ endpoint, retryAfter }) => {
  //       showWarning(`Limite excedido. Tente novamente em ${retryAfter}s`)
  //     })
  //
  //     // Escuta quando quota é excedida
  //     apiEvents.on('quotaExceeded', (data) => {
  //       setQuotaExceeded(true)
  //       showError('Limite diário de quota atingido')
  //     })
  //   })
  // }, [])

  return null // Este é apenas um exemplo conceitual
}
