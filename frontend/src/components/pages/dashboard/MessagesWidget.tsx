import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import Card from '../../Card'
import Button from '../../Button'
import Avatar from '../../Avatar'

interface MessagesWidgetProps {
  conversations: Array<{
    user: {
      id: number
      email: string
      first_name?: string
      last_name?: string
      profile_picture?: string | null
    }
    last_message?: {
      content: string
    }
    unread_count: number
  }>
  unreadMessages: number
  getUserName: (user: any) => string
}

export default function MessagesWidget({ conversations, unreadMessages, getUserName }: MessagesWidgetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const recentConversations = conversations.slice(0, 3)

  return (
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
  )
}

