import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../Button'

export default function GroupsHeader() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">{t('groups.title')}</h1>
        <p className="text-sm sm:text-base text-text-secondary mt-1">{t('groups.subtitle')}</p>
      </div>
      <Link to="/groups/new" className="flex-shrink-0">
        <Button className="w-full sm:w-auto">{t('groups.createNew')}</Button>
      </Link>
    </div>
  )
}

