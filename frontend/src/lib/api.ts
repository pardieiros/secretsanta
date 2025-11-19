import axios, { AxiosError } from 'axios'
import i18n from '../i18n/config'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token and language
api.interceptors.request.use(
  (config) => {
    // Check localStorage first, then sessionStorage
    let token = localStorage.getItem('access_token')
    if (!token) {
      token = sessionStorage.getItem('access_token')
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Add Accept-Language header based on current i18n language
    const language = i18n.language || 'en'
    config.headers['Accept-Language'] = language
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
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
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
  
  googleAuth: async (code: string) => {
    const response = await api.post('/auth/google/', { code })
    return response.data
  },
  
  requestPasswordReset: async (email: string) => {
    const response = await api.post('/auth/password-reset/request/', { email })
    return response.data
  },
  
  resetPassword: async (token: string, password: string, password2: string) => {
    const response = await api.post('/auth/password-reset/', { token, password, password2 })
    return response.data
  },
}

// User API
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/users/me/')
    return response.data
  },
  
  getUser: async (userId: number) => {
    const response = await api.get(`/users/${userId}/`)
    return response.data
  },
  
  updateProfile: async (data: any) => {
    const response = await api.patch('/users/update_profile/', data)
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
  
  getMembersWithoutGiftIdeas: async (id: number) => {
    const response = await api.get(`/groups/${id}/members_without_gift_ideas/`)
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
  
  reveal: async (id: number, revealDatetime?: string) => {
    const data = revealDatetime ? { reveal_datetime: revealDatetime } : {}
    const response = await api.post(`/groups/${id}/reveal/`, data)
    return response.data
  },
  
  getSecretSantaGiftIdeas: async (id: number) => {
    const response = await api.get(`/groups/${id}/secret_santa_gift_ideas/`)
    return response.data
  },
  
  getPendingInvites: async () => {
    const response = await api.get('/groups/pending_invites/')
    return response.data
  },
  
  searchGroups: async (query: string) => {
    const response = await api.get('/groups/search/', { params: { q: query } })
    return response.data
  },
  
  getSentInvites: async () => {
    const response = await api.get('/groups/sent_invites/')
    return response.data
  },
  
  getInviteDetails: async (id: number) => {
    const response = await api.get(`/groups/${id}/invite_details/`)
    return response.data
  },
  
  getPermissions: async (id: number) => {
    const response = await api.get(`/groups/${id}/permissions/`)
    return response.data
  },
  
  updatePermission: async (id: number, userId: number, permissions: { can_edit_settings?: boolean; can_invite_members?: boolean; can_send_messages?: boolean }) => {
    const response = await api.post(`/groups/${id}/update_permission/`, { user_id: userId, ...permissions })
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

// Friendship API
export const friendshipAPI = {
  list: async () => {
    const response = await api.get('/friendships/')
    return response.data
  },
  
  search: async (query: string) => {
    const response = await api.get('/friendships/search/', { params: { q: query } })
    return response.data
  },
  
  sendRequest: async (addresseeId: number) => {
    const response = await api.post('/friendships/', { addressee: addresseeId })
    return response.data
  },
  
  accept: async (friendshipId: number) => {
    const response = await api.post(`/friendships/${friendshipId}/accept/`)
    return response.data
  },
  
  reject: async (friendshipId: number) => {
    const response = await api.post(`/friendships/${friendshipId}/reject/`)
    return response.data
  },
  
  getFriends: async () => {
    const response = await api.get('/friendships/friends/')
    return response.data
  },
  
  inviteByEmail: async (email: string) => {
    const response = await api.post('/friendships/invite_by_email/', { email })
    return response.data
  },
}

// Message API
export const messageAPI = {
  list: async (userId?: number) => {
    const params = userId ? { user: userId } : {}
    const response = await api.get('/messages/', { params })
    return response.data
  },
  
  send: async (receiverId: number, content: string) => {
    const response = await api.post('/messages/', { receiver: receiverId, content })
    return response.data
  },
  
  getConversations: async () => {
    const response = await api.get('/messages/conversations/')
    return response.data
  },
  
  markRead: async (messageId: number) => {
    const response = await api.post(`/messages/${messageId}/mark_read/`)
    return response.data
  },
  
  markAllRead: async (userId: number) => {
    const response = await api.post('/messages/mark_all_read/', { user_id: userId })
    return response.data
  },
}

// Notification API
export const notificationAPI = {
  list: async () => {
    const response = await api.get('/notifications/')
    return response.data
  },
  
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread_count/')
    return response.data
  },
  
  markRead: async (notificationId: number) => {
    const response = await api.post(`/notifications/${notificationId}/mark_read/`)
    return response.data
  },
  
  markAllRead: async () => {
    const response = await api.post('/notifications/mark_all_read/')
    return response.data
  },
  
  rejectGroupInvite: async (notificationId: number) => {
    const response = await api.delete(`/notifications/${notificationId}/reject_group_invite/`)
    return response.data
  },
}

// Cookie Consent API
export const cookieAPI = {
  getConsent: async () => {
    const response = await api.get('/cookies/consent/')
    return response.data
  },
  
  saveConsent: async (data: {
    necessary: boolean
    functional: boolean
    analytics: boolean
    marketing: boolean
  }) => {
    const response = await api.post('/cookies/consent/', data)
    return response.data
  },
}

// Push Notifications API
export const pushAPI = {
  getVapidPublicKey: async () => {
    const response = await api.get('/push/vapid-public-key/')
    return response.data.public_key
  },
  
  subscribe: async (subscription: {
    endpoint: string
    keys: {
      p256dh: string
      auth: string
    }
  }) => {
    const response = await api.post('/push/subscribe/', subscription)
    return response.data
  },
  
  unsubscribe: async (data: { endpoint: string }) => {
    const response = await api.post('/push/unsubscribe/', data)
    return response.data
  },
  
  test: async () => {
    const response = await api.post('/push/test/')
    return response.data
  },
}

export default api

