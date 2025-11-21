import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, UserPlus } from 'lucide-react'
import Card from '../../Card'
import Button from '../../Button'
import Avatar from '../../Avatar'

interface FriendsWidgetProps {
  friends: Array<{
    id: number
    email: string
    first_name?: string
    last_name?: string
    profile_picture?: string | null
  }>
  getUserName: (user: any) => string
}

export default function FriendsWidget({ friends, getUserName }: FriendsWidgetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const recentFriends = friends.slice(0, 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="h-full">
        <div className="bg-secondary text-white rounded-lg p-4 mb-4 relative overflow-hidden">
          <div className="relative z-10">
            <Users className="w-8 h-8 mb-2" />
            <div className="text-3xl font-bold mb-1">{friends.length}</div>
            <div className="text-sm opacity-90">{t('dashboard.widgets.friends.title')}</div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/social')}
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            {t('dashboard.widgets.friends.add')}
          </Button>
          
          {recentFriends.length > 0 && (
            <div className="pt-3 border-t border-border-soft">
              <p className="text-sm font-medium text-text-main mb-2">
                {t('dashboard.widgets.friends.recent')}
              </p>
              <div className="space-y-2">
                {recentFriends.map((friend: any) => (
                  <Link
                    key={friend.id}
                    to="/social"
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface transition-colors"
                  >
                    <Avatar
                      src={friend.profile_picture}
                      name={getUserName(friend)}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-main truncate">
                        {getUserName(friend)}
                      </p>
                    </div>
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

