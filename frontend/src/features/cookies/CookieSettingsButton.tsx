import { useTranslation } from 'react-i18next'
import { useCookieConsent } from './CookieConsentContext'
import { Settings } from 'lucide-react'

interface CookieSettingsButtonProps {
  className?: string
  variant?: 'link' | 'button'
}

export default function CookieSettingsButton({
  className = '',
  variant = 'link',
}: CookieSettingsButtonProps) {
  const { t } = useTranslation()
  const { openSettings } = useCookieConsent()

  if (variant === 'link') {
    return (
      <button
        onClick={openSettings}
        className={`text-sm text-text-secondary hover:text-primary transition-colors underline ${className}`}
      >
        {t('cookies.settingsButton')}
      </button>
    )
  }

  return (
    <button
      onClick={openSettings}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-main ${className}`}
      aria-label={t('cookies.settingsButton')}
    >
      <Settings className="w-4 h-4" />
      <span className="text-sm">{t('cookies.settingsButton')}</span>
    </button>
  )
}

