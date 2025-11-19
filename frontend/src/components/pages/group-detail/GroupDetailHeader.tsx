import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Button from '../../Button'

interface GroupDetailHeaderProps {
  groupId: number
  groupName: string
  description?: string
  visibility: 'public' | 'private'
  isOwner: boolean
}

export default function GroupDetailHeader({
  groupId,
  groupName,
  description,
  visibility,
  isOwner,
}: GroupDetailHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-main break-words">
            {groupName}
          </h1>
          <span
            className={`badge text-xs sm:text-sm ${
              visibility === 'public' ? 'badge-secondary' : 'bg-gray-500 text-white'
            }`}
          >
            {visibility === 'public' ? t('groupDetail.public') : t('groupDetail.private')}
          </span>
        </div>
        {description && (
          <p className="text-sm sm:text-base text-text-secondary break-words">{description}</p>
        )}
      </div>
      {isOwner && (
        <Link to={`/groups/${groupId}/edit`} className="flex-shrink-0">
          <Button variant="secondary" className="w-full sm:w-auto">
            {t('groupDetail.editGroup')}
          </Button>
        </Link>
      )}
    </div>
  )
}

