import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { UsersRound, Plus, LogIn } from 'lucide-react'
import Card from '../../Card'
import Button from '../../Button'

interface GroupsWidgetProps {
  groups: Array<{
    id: number
    name: string
    member_count: number
  }>
}

export default function GroupsWidget({ groups }: GroupsWidgetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0 }}
    >
      <Card className="h-full">
        <div className="bg-primary text-white rounded-lg p-4 mb-4 relative overflow-hidden">
          <div className="relative z-10">
            <UsersRound className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold mb-1">{groups.length}</div>
            <div className="text-sm opacity-90">{t('dashboard.widgets.groups.title')}</div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        </div>
        
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/groups/new')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('dashboard.widgets.groups.create')}
            </Button>
            <Button
              onClick={() => navigate('/join')}
              variant="secondary"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {t('dashboard.widgets.groups.join')}
            </Button>
          </div>
          
          {groups.length > 0 && (
            <div className="pt-3 border-t border-border-soft">
              <p className="text-sm font-medium text-text-main mb-2">
                {t('dashboard.widgets.groups.recent')}
              </p>
              <div className="space-y-2">
                {groups.slice(0, 3).map((group: any) => (
                  <Link
                    key={group.id}
                    to={`/groups/${group.id}`}
                    className="block p-2 rounded-lg hover:bg-surface transition-colors"
                  >
                    <p className="text-sm font-medium text-text-main truncate">{group.name}</p>
                    <p className="text-xs text-text-secondary">
                      {group.member_count} {t('dashboard.members')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  )
}

