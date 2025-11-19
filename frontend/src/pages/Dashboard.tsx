import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, MessageCircle, UsersRound, Plus, UserPlus, LogIn } from 'lucide-react'
import { groupAPI, friendshipAPI, messageAPI } from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import Avatar from '../components/Avatar'

export default function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Fetch data for widgets
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.list(),
  })

  const { data: friendsData } = useQuery({
    queryKey: ['friends', 'list'],
    queryFn: () => friendshipAPI.getFriends(),
  })

  const { data: conversationsData } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageAPI.getConversations(),
  })

  // Handle paginated responses
  const groups = groupsData?.results || groupsData || []
  const friends = friendsData?.results || friendsData || []
  const conversations = conversationsData?.results || conversationsData || []

  // Calculate unread messages
  const unreadMessages = conversations.reduce((total: number, conv: any) => {
    return total + (conv.unread_count || 0)
  }, 0)

  // Get recent friends (last 3)
  const recentFriends = friends.slice(0, 3)

  // Get recent conversations (last 3)
  const recentConversations = conversations.slice(0, 3)

  const getUserName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
  }

  return (
    <div className="space-y-6 sm:space-y-8 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('dashboard.title')}</h1>
        <p className="text-sm sm:text-base text-text-secondary">{t('dashboard.subtitle')}</p>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups Widget */}
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

        {/* Friends Widget */}
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

        {/* Messages Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <div className={`${
              unreadMessages > 0 ? 'bg-secondary-light' : 'bg-surface'
            } ${
              unreadMessages > 0 ? 'text-white' : 'text-text-main'
            } rounded-lg p-4 mb-4 relative overflow-hidden`}>
              <div className="relative z-10">
                <MessageCircle className="w-8 h-8 mb-2" />
                <div className="text-3xl font-bold mb-1">{unreadMessages}</div>
                <div className="text-sm opacity-90">{t('dashboard.widgets.messages.title')}</div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/messages')}
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                {t('dashboard.widgets.messages.viewAll')}
              </Button>
              
              {recentConversations.length > 0 && (
                <div className="pt-3 border-t border-border-soft">
                  <p className="text-sm font-medium text-text-main mb-2">
                    {t('dashboard.widgets.messages.recent')}
                  </p>
                  <div className="space-y-2">
                    {recentConversations.map((conv: any) => (
                      <Link
                        key={conv.user.id}
                        to="/messages"
                        state={{ userId: conv.user.id }}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface transition-colors relative"
                      >
                        <div className="relative">
                          <Avatar
                            src={conv.user.profile_picture}
                            name={getUserName(conv.user)}
                            size="sm"
                          />
                          {conv.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-light text-white text-xs flex items-center justify-center font-bold">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-main truncate">
                            {getUserName(conv.user)}
                          </p>
                          {conv.last_message && (
                            <p className="text-xs text-text-secondary truncate">
                              {conv.last_message.content}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
