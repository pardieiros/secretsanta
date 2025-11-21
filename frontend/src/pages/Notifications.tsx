import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { notificationAPI } from '../lib/api'
import Avatar from '../components/Avatar'
import Card from '../components/Card'
import Button from '../components/Button'
import { format } from 'date-fns'
import { useChannel } from '../hooks/useChannel'
import { useAuth } from '../contexts/AuthContext'

export default function Notifications() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  // Get notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.list(),
    refetchInterval: false, // Disable polling, use WebSockets instead
  })

  // Listen for new notifications via WebSocket
  useChannel(
    user ? `private-user-${user.id}` : '',
    'new-notification',
    (data: any) => {
      queryClient.setQueryData(['notifications'], (oldData: any) => {
        if (!oldData) return oldData
        
        const notifications = oldData.results || oldData || []
        // Check if notification already exists
        const exists = notifications.some((n: any) => n.id === data.id)
        if (exists) return oldData
        
        // Add new notification at the beginning
        return {
          ...oldData,
          results: [data, ...notifications],
          count: (oldData.count || notifications.length) + 1,
        }
      })
      // Invalidate unread count
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    }
  )

  // Listen for other notification events
  useChannel(
    user ? `private-user-${user.id}` : '',
    'new-friend-request',
    (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    }
  )

  useChannel(
    user ? `private-user-${user.id}` : '',
    'friend-accepted',
    (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    }
  )

  useChannel(
    user ? `private-user-${user.id}` : '',
    'new-group-invite',
    (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    }
  )

  useChannel(
    user ? `private-user-${user.id}` : '',
    'group-draw-update',
    (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    }
  )

  // Handle paginated response
  const notifications = notificationsData?.results || notificationsData || []

  // Get unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationAPI.getUnreadCount(),
  })

  // Mark as read
  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = unreadData?.count || 0

  const getUserName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
      case 'friend_accepted':
        return '👥'
      case 'message':
        return '💬'
      case 'group_invite':
      case 'group_draw':
        return '🎁'
      default:
        return '🔔'
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">{t('notifications.title')}</h1>
          <p className="text-text-secondary">{t('notifications.subtitle')}</p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            variant="secondary"
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            {t('notifications.markAllRead')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : notifications.length === 0 ? (
        <Card className="text-center py-12">
          <Bell className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
          <p className="text-text-secondary">{t('notifications.noNotifications')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification: any) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={`p-4 ${
                  !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-2xl">{getNotificationIcon(notification.notification_type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-text-main mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-text-secondary mb-2">{notification.message}</p>
                        {notification.related_user && (
                          <div className="flex items-center space-x-2 mb-2">
                            <Avatar
                              src={notification.related_user.profile_picture}
                              name={getUserName(notification.related_user)}
                              size="sm"
                            />
                            <span className="text-sm text-text-secondary">
                              {getUserName(notification.related_user)}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-text-secondary">
                          {format(new Date(notification.created_at), 'PPp')}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <Button
                          onClick={() => markReadMutation.mutate(notification.id)}
                          disabled={markReadMutation.isPending}
                          className="flex-shrink-0"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

