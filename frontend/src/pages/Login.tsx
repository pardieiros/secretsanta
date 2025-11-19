import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import logo from '../assets/img/logo_256.png'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '256950564050-rm5ph1di064odm6qc2cotaevlc7nb6bl.apps.googleusercontent.com'
const GOOGLE_REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || `${window.location.origin}/auth/google/callback`

export default function Login() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    setShowLanguageMenu(false)
  }

  // Normalize language code (e.g., "pt-PT" -> "pt", "en-US" -> "en")
  const currentLanguage = (i18n.language || 'en').split('-')[0]
  const languages = [
    { code: 'pt', label: t('nav.portuguese') },
    { code: 'en', label: t('nav.english') },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password, rememberMe)
      navigate('/dashboard')
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.response?.data?.error || t('login.errors.invalidCredentials')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    setGoogleLoading(true)
    setError('')
    
    // Store rememberMe preference in sessionStorage temporarily
    // It will be used in GoogleCallback
    sessionStorage.setItem('google_remember_me', rememberMe.toString())
    
    const scope = 'email profile'
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`
    
    window.location.href = authUrl
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 relative">
      {/* Language Selector */}
      <div className="absolute top-4 right-4">
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg border-2 border-primary text-primary bg-transparent hover:bg-surface transition-colors"
            aria-label={t('nav.language')}
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm font-medium uppercase">{currentLanguage}</span>
          </button>

          <AnimatePresence>
            {showLanguageMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowLanguageMenu(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-40 bg-background rounded-lg shadow-xl border border-border-soft py-2 z-20"
                >
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full text-left px-4 py-2 hover:bg-surface transition-colors ${
                        currentLanguage === lang.code
                          ? 'text-primary font-semibold'
                          : 'text-text-main'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Card className="max-w-md w-full mx-auto px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <img src={logo} alt="Secret Santa" className="h-20 sm:h-24 w-20 sm:w-24 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('login.title')}</h1>
          <p className="text-sm sm:text-base text-text-secondary">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-secondary/10 border border-secondary text-secondary px-4 py-3 rounded-lg"
            >
              {error}
            </motion.div>
          )}

          <Input
            label={t('login.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t('login.emailPlaceholder')}
          />

          <Input
            label={t('login.password')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('login.passwordPlaceholder')}
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 text-primary bg-background border-border-soft rounded focus:ring-primary focus:ring-2"
            />
            <label htmlFor="rememberMe" className="ml-2 text-sm text-text-main cursor-pointer">
              {t('login.rememberMe')}
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? t('login.signingIn') : t('login.signIn')}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-soft"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-surface text-text-secondary">{t('login.or')}</span>
            </div>
          </div>

          <motion.button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg border-2 border-primary text-primary bg-transparent hover:bg-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{t('login.continueWithGoogle')}</span>
              </>
            )}
          </motion.button>
        </form>

        <p className="mt-6 text-center text-text-secondary">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            {t('login.signUp')}
          </Link>
        </p>
        
        <p className="mt-4 text-center">
          <Link to="/forgot-password" className="text-primary hover:underline text-sm font-medium">
            {t('login.forgotPassword')}
          </Link>
        </p>
      </Card>
    </div>
  )
}

