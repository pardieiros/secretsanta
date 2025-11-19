import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCookieConsent } from './CookieConsentContext'
import Button from '../../components/Button'

export default function CookieBanner() {
  const { t } = useTranslation()
  const { isBannerVisible, acceptAll, rejectNonEssential, openSettings } = useCookieConsent()

  if (!isBannerVisible) return null

  return (
    <AnimatePresence>
      {isBannerVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary shadow-2xl"
        >
          <div className="container mx-auto px-4 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-2">
                  <div className="text-2xl">🍪</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-text-main mb-1">
                      {t('cookies.banner.title')}
                    </h3>
                    <p className="text-sm text-text-secondary mb-2">
                      {t('cookies.banner.description')}{' '}
                      <Link
                        to="/cookies"
                        className="text-primary hover:underline font-medium"
                      >
                        {t('cookies.banner.learnMore')}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  variant="secondary"
                  onClick={rejectNonEssential}
                  className="text-sm px-4 py-2"
                >
                  {t('cookies.banner.rejectNonEssential')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={openSettings}
                  className="text-sm px-4 py-2"
                >
                  {t('cookies.banner.customize')}
                </Button>
                <Button
                  variant="primary"
                  onClick={acceptAll}
                  className="text-sm px-4 py-2"
                >
                  {t('cookies.banner.acceptAll')}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

