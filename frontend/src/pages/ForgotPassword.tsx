import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, CheckCircle } from 'lucide-react'
import { authAPI } from '../lib/api'
import Button from '../components/Button'
import Input from '../components/Input'
import Card from '../components/Card'
import logo from '../assets/img/logo_256.png'

export default function ForgotPassword() {
  const { t, i18n } = useTranslation()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    setShowLanguageMenu(false)
  }

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
      await authAPI.requestPasswordReset(email)
      setSuccess(true)
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || t('passwordReset.requestError')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
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
        {!success ? (
          <>
            <div className="text-center mb-6 sm:mb-8">
              <img src={logo} alt="Secret Santa" className="h-20 sm:h-24 w-20 sm:w-24 mx-auto mb-4" />
              <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('passwordReset.title')}</h1>
              <p className="text-sm sm:text-base text-text-secondary">{t('passwordReset.subtitle')}</p>
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
                label={t('passwordReset.email')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('passwordReset.emailPlaceholder')}
              />

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? t('passwordReset.sending') : t('passwordReset.sendLink')}
              </Button>
            </form>

            <p className="mt-6 text-center text-text-secondary">
              {t('passwordReset.rememberPassword')}{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                {t('passwordReset.backToLogin')}
              </Link>
            </p>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-8"
          >
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-success" />
            <h2 className="text-2xl font-bold text-text-main mb-2">{t('passwordReset.emailSent')}</h2>
            <p className="text-text-secondary mb-6">{t('passwordReset.emailSentMessage')}</p>
            <Link to="/login">
              <Button variant="primary" className="w-full">
                {t('passwordReset.backToLogin')}
              </Button>
            </Link>
          </motion.div>
        )}
      </Card>
    </div>
  )
}




