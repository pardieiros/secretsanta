import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { groupAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import emptyState from '../assets/img/image.png'

export default function Groups() {
  const { t } = useTranslation()
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.list(),
  })

  // Handle paginated response
  const groups = groupsData?.results || groupsData || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main">{t('groups.title')}</h1>
          <p className="text-sm sm:text-base text-text-secondary mt-1">{t('groups.subtitle')}</p>
        </div>
        <Link to="/groups/new" className="flex-shrink-0">
          <Button className="w-full sm:w-auto">{t('groups.createNew')}</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <img src={emptyState} alt="No groups" className="h-64 mx-auto mb-6 opacity-50" />
          <h2 className="text-2xl font-bold text-text-main mb-2">{t('groups.noGroups')}</h2>
          <p className="text-text-secondary mb-6">{t('groups.noGroupsSubtitle')}</p>
          <Link to="/groups/new">
            <Button>{t('groups.createGroup')}</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => (
            <Link key={group.id} to={`/groups/${group.id}`}>
              <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-text-main">{group.name}</h3>
                  <div className="flex gap-2">
                    <span className={`badge text-xs ${group.visibility === 'public' ? 'badge-secondary' : 'bg-gray-500 text-white'}`}>
                      {group.visibility === 'public' ? t('groups.public') : t('groups.private')}
                    </span>
                    {group.is_owner && (
                      <span className="badge-secondary text-xs">{t('groups.owner')}</span>
                    )}
                  </div>
                </div>
                
                {group.description && (
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                    {group.description}
                  </p>
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
          ))}
        </div>
      )}
    </div>
  )
}

