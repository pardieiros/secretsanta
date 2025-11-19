import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import Card from '../../Card'

interface GroupCardProps {
  group: {
    id: number
    name: string
    description?: string
    visibility: 'public' | 'private'
    is_owner: boolean
    member_count: number
    min_participants: number
    draw_datetime: string
    exchange_date: string
    is_drawn: boolean
    can_draw: boolean
  }
}

export default function GroupCard({ group }: GroupCardProps) {
  const { t } = useTranslation()

  return (
    <Link to={`/groups/${group.id}`}>
      <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-text-main">{group.name}</h3>
          <div className="flex gap-2">
            <span
              className={`badge text-xs ${
                group.visibility === 'public' ? 'badge-secondary' : 'bg-gray-500 text-white'
              }`}
            >
              {group.visibility === 'public' ? t('groups.public') : t('groups.private')}
            </span>
            {group.is_owner && <span className="badge-secondary text-xs">{t('groups.owner')}</span>}
          </div>
        </div>

        {group.description && (
          <p className="text-text-secondary text-sm mb-4 line-clamp-2">{group.description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">{t('groups.members')}:</span>
            <span className="font-medium text-text-main">
              {group.member_count} / {group.min_participants}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-text-secondary">{t('groups.drawDate')}:</span>
            <span className="font-medium text-text-main">
              {format(new Date(group.draw_datetime), 'MMM dd, yyyy')}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-text-secondary">{t('groups.exchange')}:</span>
            <span className="font-medium text-text-main">
              {format(new Date(group.exchange_date), 'MMM dd, yyyy')}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border-soft">
          {group.is_drawn ? (
            <span className="badge-success">{t('groups.drawCompleted')}</span>
          ) : group.can_draw ? (
            <span className="badge-warning">{t('groups.readyToDraw')}</span>
          ) : (
            <span className="badge bg-gray-400 text-white">{t('groups.pending')}</span>
          )}
        </div>
      </Card>
    </Link>
  )
}

