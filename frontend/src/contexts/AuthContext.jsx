import { createContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext()

export default AuthContext

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [currentTenant, setCurrentTenant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    const tenantData = localStorage.getItem('currentTenant')

    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
        if (tenantData) {
          setCurrentTenant(JSON.parse(tenantData))
        }
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        localStorage.removeItem('currentTenant')
      }
    }

    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      const { token, user: userData, default_tenant } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)

      if (default_tenant) {
        localStorage.setItem('currentTenant', JSON.stringify(default_tenant))
        setCurrentTenant(default_tenant)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao fazer login',
      }
    }
  }

  const register = async (email, nome, password) => {
    try {
      const response = await authAPI.register({ email, nome, password })
      const { token, user: userData } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setUser(userData)

      // Registro cria tenant automaticamente no backend, mas resposta pode variar.
      // Idealmente backend retornaria o tenant criado.
      // Por enquanto, deixamos null e usuário pode criar ou ser adicionado.

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Erro ao registrar',
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('currentTenant')
    setUser(null)
    setCurrentTenant(null)
  }

  const updateUser = (updates) => {
    const next = { ...(user || {}), ...updates }
    setUser(next)
    try {
      localStorage.setItem('user', JSON.stringify(next))
    } catch (_) {
      // ignore
    }
  }

  const switchTenant = (tenant) => {
    setCurrentTenant(tenant)
    localStorage.setItem('currentTenant', JSON.stringify(tenant))
    // Opcional: recarregar página ou limpar caches se necessário
    window.location.reload()
  }

  const value = {
    user,
    currentTenant,
    login,
    register,
    logout,
    updateUser,
    switchTenant,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

