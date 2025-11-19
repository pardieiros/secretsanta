import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, Users, UsersRound, MessageCircle, Bell, Settings, LogOut, Menu, X, Globe, Check, CheckCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { notificationAPI, messageAPI } from '../lib/api'
import Avatar from './Avatar'
import { format } from 'date-fns'
import logo from '../assets/img/logo_128.png'

export default function Layout() {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMessages, setShowMessages] = useState(false)
  const queryClient = useQueryClient()

  // Get notifications
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.list(),
    refetchInterval: 10000, // Poll every 10 seconds
  })

  // Get unread count
  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationAPI.getUnreadCount(),
    refetchInterval: 10000,
  })

  // Get conversations for messages dropdown
  const { data: conversationsData } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageAPI.getConversations(),
    refetchInterval: 10000,
  })

  // Handle paginated response
  const notifications = notificationsData?.results || notificationsData || []
  const unreadCount = unreadData?.count || 0
  const conversations = conversationsData?.results || conversationsData || []
  
  // Calculate unread messages count
  const unreadMessagesCount = conversations.reduce((total: number, conv: any) => {
    return total + (conv.unread_count || 0)
  }, 0)

  // Mark as read
  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationAPI.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    },
  })

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] })
    },
  })

  const getUserName = (userObj?: any) => {
    const targetUser = userObj || user
    if (targetUser?.first_name && targetUser?.last_name) {
      return `${targetUser.first_name} ${targetUser.last_name}`
    }
    return targetUser?.email || ''
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
    setShowLanguageMenu(false)
  }

  // Normalize language code (e.g., "pt-PT" -> "pt", "en-US" -> "en")
  const currentLanguage = (i18n.language || 'en').split('-')[0]
  const languages = [
    { code: 'pt', label: t('nav.portuguese') },
    { code: 'en', label: t('nav.english') },
  ]

  const navItems = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: Home },
    { path: '/groups', label: t('nav.groups'), icon: UsersRound },
    { path: '/social', label: t('nav.social'), icon: Users },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary text-text-on-light shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <img src={logo} alt="Secret Santa" className="h-10 w-10" />
              <span className="text-xl font-bold hidden sm:block">Secret Santa</span>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path || 
                  (item.path === '/dashboard' && location.pathname === '/')
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-text-on-light hover:bg-primary/20'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Language & User Menu */}
            {user && (
              <div className="flex items-center space-x-4">
                {/* Messages Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMessages(!showMessages)}
                    className="relative flex items-center justify-center p-2 rounded-lg hover:bg-primary/20 transition-colors text-text-on-light"
                    aria-label={t('nav.messages')}
                  >
                    <MessageCircle className="w-5 h-5" />
                    {unreadMessagesCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-light text-white text-xs flex items-center justify-center font-bold">
                        {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showMessages && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-black/50 md:bg-transparent"
                          onClick={() => setShowMessages(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="fixed inset-0 md:absolute md:right-0 md:top-auto md:mt-2 md:w-96 md:max-h-[calc(100vh-8rem)] md:rounded-lg md:shadow-xl md:border md:border-border-soft bg-background z-50 flex flex-col"
                        >
                          {/* Header */}
                          <div className="p-4 border-b border-border-soft flex items-center justify-between">
                            <h3 className="font-semibold text-text-main">{t('messages.title')}</h3>
                            <div className="flex items-center gap-3">
                              <Link
                                to="/messages"
                                onClick={() => setShowMessages(false)}
                                className="text-sm text-primary hover:underline hidden sm:block"
                              >
                                {t('messages.viewAll')}
                              </Link>
                              <button
                                onClick={() => setShowMessages(false)}
                                className="md:hidden p-1 rounded-lg hover:bg-surface transition-colors text-text-main"
                                aria-label={t('nav.close')}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Conversations List */}
                          <div className="overflow-y-auto flex-1 md:max-h-[calc(100vh-16rem)]">
                            {conversations.length === 0 ? (
                              <div className="p-8 text-center">
                                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-text-secondary" />
                                <p className="text-text-secondary text-sm">{t('messages.noConversations')}</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-border-soft">
                                {conversations.slice(0, 10).map((conversation: any) => (
                                  <Link
                                    key={conversation.user.id}
                                    to="/messages"
                                    state={{ userId: conversation.user.id }}
                                    onClick={() => setShowMessages(false)}
                                    className="block p-4 hover:bg-surface transition-colors"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="relative flex-shrink-0">
                                        <Avatar
                                          src={conversation.user.profile_picture}
                                          name={getUserName(conversation.user)}
                                          size="md"
                                        />
                                        {conversation.unread_count > 0 && (
                                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-light text-white text-xs flex items-center justify-center font-bold">
                                            {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                          <h4 className="font-semibold text-text-main text-sm truncate">
                                            {getUserName(conversation.user)}
                                          </h4>
                                          {conversation.last_message && (
                                            <p className="text-xs text-text-secondary flex-shrink-0">
                                              {format(new Date(conversation.last_message.created_at), 'HH:mm')}
                                            </p>
                                          )}
                                        </div>
                                        {conversation.last_message && (
                                          <p className={`text-sm truncate ${
                                            conversation.unread_count > 0 
                                              ? 'text-text-main font-medium' 
                                              : 'text-text-secondary'
                                          }`}>
                                            {conversation.last_message.content}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </Link>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          {conversations.length > 0 && (
                            <div className="p-3 border-t border-border-soft">
                              <Link
                                to="/messages"
                                onClick={() => setShowMessages(false)}
                                className="block text-center text-sm text-primary hover:underline"
                              >
                                {t('messages.viewAll')}
                              </Link>
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Notifications Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative flex items-center justify-center p-2 rounded-lg hover:bg-primary/20 transition-colors text-text-on-light"
                    aria-label={t('nav.notifications')}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-light text-white text-xs flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {showNotifications && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-black/50 md:bg-transparent"
                          onClick={() => setShowNotifications(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="fixed inset-0 md:absolute md:right-0 md:top-auto md:mt-2 md:w-96 md:max-h-[calc(100vh-8rem)] md:rounded-lg md:shadow-xl md:border md:border-border-soft bg-background z-50 flex flex-col"
                        >
                          {/* Header */}
                          <div className="p-4 border-b border-border-soft flex items-center justify-between">
                            <h3 className="font-semibold text-text-main">{t('notifications.title')}</h3>
                            <div className="flex items-center gap-3">
                              {unreadCount > 0 && (
                                <button
                                  onClick={() => markAllReadMutation.mutate()}
                                  disabled={markAllReadMutation.isPending}
                                  className="text-sm text-primary hover:underline flex items-center gap-1"
                                >
                                  <CheckCheck className="w-4 h-4" />
                                  <span className="hidden sm:inline">{t('notifications.markAllRead')}</span>
                                </button>
                              )}
                              <button
                                onClick={() => setShowNotifications(false)}
                                className="md:hidden p-1 rounded-lg hover:bg-surface transition-colors text-text-main"
                                aria-label={t('nav.close')}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          </div>

                          {/* Notifications List */}
                          <div className="overflow-y-auto flex-1 md:max-h-[calc(100vh-16rem)]">
                            {notifications.length === 0 ? (
                              <div className="p-8 text-center">
                                <Bell className="w-12 h-12 mx-auto mb-3 text-text-secondary" />
                                <p className="text-text-secondary text-sm">{t('notifications.noNotifications')}</p>
                              </div>
                            ) : (
                              <div className="divide-y divide-border-soft">
                                {notifications.slice(0, 10).map((notification: any) => {
                                  const isGroupInvite = notification.notification_type === 'group_invite'
                                  const isFriendRequest = notification.notification_type === 'friend_request'
                                  
                                  const handleNotificationClick = () => {
                                    if (!notification.is_read) {
                                      markReadMutation.mutate(notification.id)
                                    }
                                    setShowNotifications(false)
                                  }
                                  
                                  const content = (
                                    <div
                                      className={`p-4 hover:bg-surface transition-colors ${
                                        !notification.is_read ? 'bg-primary/5' : ''
                                      } ${isGroupInvite || isFriendRequest ? 'cursor-pointer' : ''}`}
                                    >
                                    <div className="flex items-start gap-3">
                                      <div className="text-xl flex-shrink-0">
                                        {getNotificationIcon(notification.notification_type)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-text-main text-sm mb-1">
                                              {notification.title}
                                            </h4>
                                            <p className="text-text-secondary text-sm mb-2 line-clamp-2">
                                              {notification.message}
                                            </p>
                                            {notification.related_user && (
                                              <div className="flex items-center gap-2 mb-2">
                                                <Avatar
                                                  src={notification.related_user.profile_picture}
                                                  name={getUserName(notification.related_user)}
                                                  size="sm"
                                                />
                                                <span className="text-xs text-text-secondary">
                                                  {getUserName(notification.related_user)}
                                                </span>
                                              </div>
                                            )}
                                            <p className="text-xs text-text-secondary">
                                              {format(new Date(notification.created_at), 'PPp')}
                                            </p>
                                          </div>
                                          {!notification.is_read && !isFriendRequest && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                markReadMutation.mutate(notification.id)
                                              }}
                                              disabled={markReadMutation.isPending}
                                              className="flex-shrink-0 p-1 rounded hover:bg-surface transition-colors"
                                              title={t('notifications.markAsRead')}
                                            >
                                              <Check className="w-4 h-4 text-text-secondary" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    </div>
                                  )
                                  
                                  if (isGroupInvite) {
                                    return (
                                      <Link
                                        key={notification.id}
                                        to="/groups/invites"
                                        onClick={handleNotificationClick}
                                      >
                                        {content}
                                      </Link>
                                    )
                                  }
                                  
                                  if (isFriendRequest) {
                                    return (
                                      <Link
                                        key={notification.id}
                                        to="/social"
                                        state={{ activeTab: 'requests' }}
                                        onClick={handleNotificationClick}
                                      >
                                        {content}
                                      </Link>
                                    )
                                  }
                                  
                                  return (
                                    <div key={notification.id}>
                                      {content}
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          {notifications.length > 0 && (
                            <div className="p-3 border-t border-border-soft">
                              <Link
                                to="/notifications"
                                onClick={() => setShowNotifications(false)}
                                className="block text-center text-sm text-primary hover:underline"
                              >
                                {t('notifications.viewAll')}
                              </Link>
                            </div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Language Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-primary/20 transition-colors text-text-on-light"
                    aria-label={t('nav.language')}
                  >
                    <Globe className="w-5 h-5" />
                    <span className="hidden sm:block text-sm font-medium uppercase">
                      {currentLanguage}
                    </span>
                  </button>

                  <AnimatePresence>
                    {showLanguageMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowLanguageMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-auto min-w-[10rem] max-w-[20rem] bg-background rounded-lg shadow-xl border border-border-soft py-2 z-20"
                        >
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => changeLanguage(lang.code)}
                              className={`w-full text-left px-4 py-2 hover:bg-surface transition-colors whitespace-nowrap ${
                                currentLanguage === lang.code
                                  ? 'text-primary font-semibold'
                                  : 'text-text-main'
                              }`}
                            >
                              {lang.label}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="md:hidden text-text-on-light"
                >
                  {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 hover:opacity-90 transition-opacity"
                  >
                    <Avatar
                      src={user.profile_picture}
                      name={getUserName()}
                      size="md"
                    />
                    <span className="hidden sm:block text-sm font-medium">{getUserName()}</span>
                  </button>

                  <AnimatePresence>
                    {showUserMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute right-0 mt-2 w-auto min-w-[12rem] max-w-[20rem] bg-background rounded-lg shadow-xl border border-border-soft py-2 z-20"
                        >
                          <Link
                            to="/settings"
                            className="flex items-center space-x-2 px-4 py-2 hover:bg-surface transition-colors text-text-main whitespace-nowrap"
                            onClick={() => setShowUserMenu(false)}
                          >
                            <Settings className="w-4 h-4 flex-shrink-0" />
                            <span>{t('nav.settings')}</span>
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-surface transition-colors text-text-main whitespace-nowrap"
                          >
                            <LogOut className="w-4 h-4 flex-shrink-0" />
                            <span>{t('nav.logout')}</span>
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>


              </div>
            )}
          </div>

          {/* Mobile Navigation */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.nav
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 pb-4 space-y-2"
              >
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setShowMobileMenu(false)}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-text-on-light hover:bg-primary/20'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-0 sm:px-4 py-4 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}

