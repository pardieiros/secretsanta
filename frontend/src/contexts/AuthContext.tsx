import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authAPI, userAPI } from '../lib/api'

interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  profile_picture?: string | null
  phone?: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (data: RegisterData, rememberMe?: boolean) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string, rememberMe: boolean) => void
}

interface RegisterData {
  email: string
  username: string
  first_name: string
  last_name: string
  password: string
  password2: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    // Check localStorage first (remember me), then sessionStorage
    let token = localStorage.getItem('access_token')
    
    if (!token) {
      token = sessionStorage.getItem('access_token')
    }
    
    if (token) {
      try {
        const userData = await userAPI.getMe()
        setUser(userData)
      } catch (error) {
        // Clear tokens from both storages
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        sessionStorage.removeItem('access_token')
        sessionStorage.removeItem('refresh_token')
      }
    }
    setLoading(false)
  }
  
  const setTokens = (accessToken: string, refreshToken: string, rememberMe: boolean = false) => {
    if (rememberMe) {
      // Store in localStorage (persistent)
      localStorage.setItem('access_token', accessToken)
      localStorage.setItem('refresh_token', refreshToken)
      // Clear sessionStorage if exists
      sessionStorage.removeItem('access_token')
      sessionStorage.removeItem('refresh_token')
    } else {
      // Store in sessionStorage (temporary, cleared on browser close)
      sessionStorage.setItem('access_token', accessToken)
      sessionStorage.setItem('refresh_token', refreshToken)
      // Clear localStorage if exists
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }
  }
  
  const clearTokens = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
  }

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    const data = await authAPI.login(email, password)
    setTokens(data.access, data.refresh, rememberMe)
    const userData = await userAPI.getMe()
    setUser(userData)
  }

  const register = async (data: RegisterData, rememberMe: boolean = false) => {
    await authAPI.register(data)
    await login(data.email, data.password, rememberMe)
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, setUser, setTokens }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

