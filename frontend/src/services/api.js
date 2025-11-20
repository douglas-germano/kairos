import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Event emitter para comunicação com hooks
export const apiEvents = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  },
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data))
    }
  }
}

// Interceptor para adicionar token e tenant
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    const currentTenant = localStorage.getItem('currentTenant')
    if (currentTenant) {
      try {
        const tenant = JSON.parse(currentTenant)
        if (tenant && tenant.id) {
          config.headers['X-Tenant-ID'] = tenant.id
        }
      } catch (e) {
        console.error('Error parsing tenant for header', e)
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar respostas e extrair informações de rate limit
api.interceptors.response.use(
  (response) => {
    // Extrai headers de rate limit se existirem
    const headers = response.headers
    const rateLimitInfo = {
      limit: headers['x-ratelimit-limit'],
      remaining: headers['x-ratelimit-remaining'],
      reset: headers['x-ratelimit-reset']
    }

    // Se houver informações de rate limit, emite evento
    if (rateLimitInfo.limit) {
      const endpoint = response.config.url
      apiEvents.emit('rateLimit', { endpoint, ...rateLimitInfo })
    }

    return response
  },
  (error) => {
    // Tratamento especial para erro 401 (Unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      apiEvents.emit('unauthorized', error.response.data)
      window.location.href = '/login'
    }

    // Tratamento para erro 429 (Rate Limit)
    if (error.response?.status === 429) {
      const headers = error.response.headers
      const retryAfter = headers['retry-after']
      apiEvents.emit('rateLimitExceeded', {
        endpoint: error.config.url,
        retryAfter
      })
    }

    // Tratamento para quota excedida
    if (error.response?.data?.code === 'QUOTA_EXCEEDED') {
      apiEvents.emit('quotaExceeded', error.response.data)
    }

    return Promise.reject(error)
  }
)

// Auth
export const authAPI = {
  register: (data) => api.post('/api/v1/auth/register', data),
  login: (data) => api.post('/api/v1/auth/login', data),
  getUser: (userId) => api.get(`/api/v1/auth/user/${userId}`),
  updateUser: (userId, data) => api.put(`/api/v1/auth/user/${userId}`, data),
  deleteUser: (userId) => api.delete(`/api/v1/auth/user/${userId}`),
  changePassword: (userId, data) => api.put(`/api/v1/auth/user/${userId}/password`, data),
  forgotPassword: (data) => api.post('/api/v1/auth/forgot-password', data),
  verifyCode: (data) => api.post('/api/v1/auth/verify-code', data),
  resetPassword: (data) => api.post('/api/v1/auth/reset-password', data),
  getQuota: () => api.get('/api/v1/auth/quota'),
}

// Projects
export const projectsAPI = {
  create: (data) => api.post('/api/v1/projects/create', data),
  get: (projectId) => api.get(`/api/v1/projects/${projectId}`),
  getByTenant: (tenantId, params = {}) => {
    const { offset = 0, limit = 50 } = params
    return api.get(`/api/v1/projects/tenant/${tenantId}`, { params: { offset, limit } })
  },
  getByUser: (userId, params = {}) => {
    const { offset = 0, limit = 50 } = params
    return api.get(`/api/v1/projects/user/${userId}`, { params: { offset, limit } })
  },
  update: (projectId, data) => api.put(`/api/v1/projects/${projectId}`, data),
  delete: (projectId) => api.delete(`/api/v1/projects/${projectId}`),
  getFiles: (projectId) => api.get(`/api/v1/projects/${projectId}/files`),
  createFile: (projectId, data) => api.post(`/api/v1/projects/${projectId}/files/create`, data),
  getMyFiles: () => api.get('/api/v1/projects/files/mine'),
  getFile: (fileId) => api.get(`/api/v1/projects/files/${fileId}`),
  updateFile: (fileId, data) => api.put(`/api/v1/projects/files/${fileId}`, data),
  deleteFile: (fileId) => api.delete(`/api/v1/projects/files/${fileId}`),
}

// Tenants
export const tenantsAPI = {
  create: (data) => api.post('/api/v1/tenants/create', data),
  get: (tenantId) => api.get(`/api/v1/tenants/${tenantId}`),
  getUsers: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/users`),
  addUser: (tenantId, data) => api.post(`/api/v1/tenants/${tenantId}/add-user`, data),
  addUserByEmail: (tenantId, data) => api.post(`/api/v1/tenants/${tenantId}/add-user-by-email`, data),
  getMine: () => api.get('/api/v1/tenants/mine'),
  update: (tenantId, data) => api.put(`/api/v1/tenants/${tenantId}`, data),
  delete: (tenantId) => api.delete(`/api/v1/tenants/${tenantId}`),
  removeUserByEmail: (tenantId, data) => api.delete(`/api/v1/tenants/${tenantId}/remove-user-by-email`, { data }),
  getQuota: (tenantId) => api.get(`/api/v1/tenants/${tenantId}/quota`),
}

// Swipes
export const swipesAPI = {
  createTenant: (data) => api.post('/api/v1/swipes/tenant/create', data),
  getGlobal: () => api.get('/api/v1/swipes/global'),
  getByTenant: (tenantId) => api.get(`/api/v1/swipes/tenant/${tenantId}`),
  delete: (swipeId) => api.delete(`/api/v1/swipes/tenant/${swipeId}`),
  like: (swipeId) => api.post(`/api/v1/swipes/global/${swipeId}/like`),
}

// Chat
export const chatAPI = {
  sendMessage: (data) => api.post('/api/v1/chat/message', data),
  getConversation: (conversationId) => api.get(`/api/v1/chat/conversation/${conversationId}`),
  getConversations: (params = {}) => {
    const { offset = 0, limit = 50 } = params
    return api.get('/api/v1/chat/conversations', { params: { offset, limit } })
  },
  getConversationsByTenant: (tenantId, params = {}) => {
    const { offset = 0, limit = 50 } = params
    return api.get(`/api/v1/chat/tenant/${tenantId}/conversations`, { params: { offset, limit } })
  },
  deleteConversation: (conversationId) => api.delete(`/api/v1/chat/conversation/${conversationId}`),
}

// Custom AIs
export const customAIsAPI = {
  create: (data) => api.post('/api/v1/custom-ais/create', data),
  get: (id) => api.get(`/api/v1/custom-ais/${id}`),
  getByTenant: (tenantId, params = {}) => {
    const { offset = 0, limit = 50 } = params
    return api.get(`/api/v1/custom-ais/tenant/${tenantId}`, { params: { offset, limit } })
  },
  update: (id, data) => api.put(`/api/v1/custom-ais/${id}`, data),
  delete: (id) => api.delete(`/api/v1/custom-ais/${id}`),
  getConversations: (customAiId) => api.get(`/api/v1/custom-ais/${customAiId}/conversations`),
  createConversation: (customAiId, data) => api.post(`/api/v1/custom-ais/${customAiId}/conversations/create`, data),
  sendMessage: (conversationId, data) => api.post(`/api/v1/custom-ais/conversations/${conversationId}/send`, data),
  getHistory: (conversationId) => api.get(`/api/v1/custom-ais/conversations/${conversationId}/history`),
}

// Images
export const imagesAPI = {
  create: (data) => api.post('/api/v1/images/create', data),
}

export const visionAPI = {
  analyze: (data) => api.post('/api/v1/vision/analyze', data),
}

export const aiAPI = {
  improveText: (text) => api.post('/api/v1/ai/improve-text', { text }),
  continueWriting: (context) => api.post('/api/v1/ai/continue-writing', { context }),
  summarize: (text) => api.post('/api/v1/ai/summarize', { text }),
  translate: (text, target_language) => api.post('/api/v1/ai/translate', { text, target_language }),
}

export const voiceAPI = {
  transcribe: (formData) => api.post('/api/v1/voice/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export default api

