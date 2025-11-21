import { useTranslation } from 'react-i18next'

export default function DashboardHeader() {
  const { t } = useTranslation()

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('dashboard.title')}</h1>
      <p className="text-sm sm:text-base text-text-secondary">{t('dashboard.subtitle')}</p>
    </div>
  )
}

