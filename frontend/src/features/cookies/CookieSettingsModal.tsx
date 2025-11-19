import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCookieConsent } from './CookieConsentContext'
import Button from '../../components/Button'
import { X, Info } from 'lucide-react'

export default function CookieSettingsModal() {
  const { t } = useTranslation()
  const {
    isSettingsOpen,
    closeSettings,
    savePreferences,
    consent,
    acceptAll,
    rejectNonEssential,
  } = useCookieConsent()

  const [preferences, setPreferences] = useState({
    functional: false,
    analytics: false,
    marketing: false,
  })

  // Load current consent into preferences when modal opens
  useEffect(() => {
    if (isSettingsOpen && consent) {
      setPreferences({
        functional: consent.functional,
        analytics: consent.analytics,
        marketing: consent.marketing,
      })
    }
  }, [isSettingsOpen, consent])

  const handleToggle = (key: 'functional' | 'analytics' | 'marketing') => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = () => {
    savePreferences(preferences)
  }

  if (!isSettingsOpen) return null

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSettings}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border-soft"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-background border-b border-border-soft p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-text-main mb-1">
                    {t('cookies.settings.title')}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    {t('cookies.settings.subtitle')}
                  </p>
                </div>
                <button
                  onClick={closeSettings}
                  className="p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-main"
                  aria-label={t('cookies.settings.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    onClick={rejectNonEssential}
                    className="text-sm"
                  >
                    {t('cookies.settings.rejectAll')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={acceptAll}
                    className="text-sm"
                  >
                    {t('cookies.settings.acceptAll')}
                  </Button>
                </div>

                {/* Necessary Cookies - Always On */}
                <div className="bg-surface rounded-lg p-4 border border-border-soft">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-text-main">
                          {t('cookies.settings.necessary.title')}
                        </h3>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {t('cookies.settings.alwaysActive')}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {t('cookies.settings.necessary.description')}
                      </p>
                    </div>
                    <div className="ml-4">
                      <div className="relative inline-block w-12 h-6 bg-primary rounded-full opacity-50 cursor-not-allowed">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="bg-surface rounded-lg p-4 border border-border-soft">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-main mb-2">
                        {t('cookies.settings.functional.title')}
                      </h3>
                      <p className="text-sm text-text-secondary mb-2">
                        {t('cookies.settings.functional.description')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('functional')}
                      className={`ml-4 relative inline-block w-12 h-6 rounded-full transition-colors ${
                        preferences.functional ? 'bg-primary' : 'bg-gray-300'
                      }`}
                      aria-label={t('cookies.settings.toggle')}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.functional ? 'right-1' : 'left-1'
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="bg-surface rounded-lg p-4 border border-border-soft">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-main mb-2">
                        {t('cookies.settings.analytics.title')}
                      </h3>
                      <p className="text-sm text-text-secondary mb-2">
                        {t('cookies.settings.analytics.description')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('analytics')}
                      className={`ml-4 relative inline-block w-12 h-6 rounded-full transition-colors ${
                        preferences.analytics ? 'bg-primary' : 'bg-gray-300'
                      }`}
                      aria-label={t('cookies.settings.toggle')}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.analytics ? 'right-1' : 'left-1'
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="bg-surface rounded-lg p-4 border border-border-soft">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-main mb-2">
                        {t('cookies.settings.marketing.title')}
                      </h3>
                      <p className="text-sm text-text-secondary mb-2">
                        {t('cookies.settings.marketing.description')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('marketing')}
                      className={`ml-4 relative inline-block w-12 h-6 rounded-full transition-colors ${
                        preferences.marketing ? 'bg-primary' : 'bg-gray-300'
                      }`}
                      aria-label={t('cookies.settings.toggle')}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          preferences.marketing ? 'right-1' : 'left-1'
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex gap-3">
                  <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-text-secondary">
                    <p className="mb-1">
                      {t('cookies.settings.info')}{' '}
                      <Link
                        to="/cookies"
                        className="text-primary hover:underline font-medium"
                      >
                        {t('cookies.settings.policyLink')}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-background border-t border-border-soft p-6 flex flex-col sm:flex-row gap-3 justify-end">
                <Button variant="secondary" onClick={closeSettings}>
                  {t('cookies.settings.cancel')}
                </Button>
                <Button variant="primary" onClick={handleSave}>
                  {t('cookies.settings.savePreferences')}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

