import axios, { AxiosError } from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: async (data: { email: string; username: string; first_name: string; last_name: string; password: string; password2: string }) => {
    const response = await api.post('/register/', data)
    return response.data
  },
  
  login: async (email: string, password: string) => {
    const response = await api.post('/token/', { email, password })
    return response.data
  },
  
  refreshToken: async (refresh: string) => {
    const response = await api.post('/token/refresh/', { refresh })
    return response.data
  },
}

// User API
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/users/me/')
    return response.data
  },
}

// Group API
export const groupAPI = {
  list: async () => {
    const response = await api.get('/groups/')
    return response.data
  },
  
  get: async (id: number) => {
    const response = await api.get(`/groups/${id}/`)
    return response.data
  },
  
  create: async (data: any) => {
    const response = await api.post('/groups/', data)
    return response.data
  },
  
  update: async (id: number, data: any) => {
    const response = await api.patch(`/groups/${id}/`, data)
    return response.data
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/groups/${id}/`)
    return response.data
  },
  
  join: async (inviteCode: string) => {
    const response = await api.post('/groups/join/', { invite_code: inviteCode })
    return response.data
  },
  
  getMembers: async (id: number) => {
    const response = await api.get(`/groups/${id}/members/`)
    return response.data
  },
  
  sendInviteEmail: async (id: number, email: string) => {
    const response = await api.post(`/groups/${id}/invite_email/`, { email })
    return response.data
  },
  
  draw: async (id: number) => {
    const response = await api.post(`/groups/${id}/draw/`)
    return response.data
  },
  
  getMyAssignment: async (id: number) => {
    const response = await api.get(`/groups/${id}/my_assignment/`)
    return response.data
  },
  
  getWhoDrewMe: async (id: number) => {
    const response = await api.get(`/groups/${id}/who_drew_me/`)
    return response.data
  },
}

// Gift Idea API
export const giftIdeaAPI = {
  list: async (groupId?: number) => {
    const params = groupId ? { group: groupId } : {}
    const response = await api.get('/gift-ideas/', { params })
    return response.data
  },
  
  get: async (id: number) => {
    const response = await api.get(`/gift-ideas/${id}/`)
    return response.data
  },
  
  create: async (data: { group: number; title: string; description?: string }) => {
    const response = await api.post('/gift-ideas/', data)
    return response.data
  },
  
  update: async (id: number, data: { title?: string; description?: string }) => {
    const response = await api.patch(`/gift-ideas/${id}/`, data)
    return response.data
  },
  
  delete: async (id: number) => {
    const response = await api.delete(`/gift-ideas/${id}/`)
    return response.data
  },
  
  getReceiverIdeas: async (groupId: number) => {
    const response = await api.get(`/gift-ideas/${groupId}/receiver_ideas/`)
    return response.data
  },
}

export default api

