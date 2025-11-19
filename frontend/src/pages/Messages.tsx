import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Send, MessageCircle } from 'lucide-react'
import { messageAPI, userAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/Avatar'
import Card from '../components/Card'
import { format } from 'date-fns'

export default function Messages() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    location.state?.userId || null
  )
  const [messageContent, setMessageContent] = useState('')
  const queryClient = useQueryClient()

  // Get conversations
  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageAPI.getConversations(),
    refetchInterval: 5000, // Poll every 5 seconds for new conversations
  })

  // Handle paginated response
  const conversations = conversationsData?.results || conversationsData || []

  // Get messages for selected user
  const { data: messagesData, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: () => messageAPI.list(selectedUserId!),
    enabled: selectedUserId !== null,
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  })

  // Handle paginated response
  const messages = messagesData?.results || messagesData || []
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mark messages as read when viewing
  const markAllReadMutation = useMutation({
    mutationFn: (userId: number) => messageAPI.markAllRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
    },
  })

  useEffect(() => {
    if (selectedUserId && messages.length > 0) {
      // Mark all messages from this user as read
      const unreadMessages = messages.filter((m: any) => !m.is_read && m.sender.id !== user?.id)
      if (unreadMessages.length > 0) {
        markAllReadMutation.mutate(selectedUserId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, messages])

  // Update selectedUserId when location.state changes
  useEffect(() => {
    if (location.state?.userId) {
      setSelectedUserId(location.state.userId)
    }
  }, [location.state])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => messageAPI.send(selectedUserId!, content),
    onSuccess: () => {
      setMessageContent('')
      queryClient.invalidateQueries({ queryKey: ['messages', selectedUserId] })
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
    },
  })

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (messageContent.trim() && selectedUserId) {
      sendMessageMutation.mutate(messageContent.trim())
    }
  }

  const selectedConversation = conversations.find((c: any) => c.user.id === selectedUserId)
  
  // Get user info if userId is passed but no conversation exists
  const { data: selectedUserData } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: () => userAPI.getUser(selectedUserId!),
    enabled: selectedUserId !== null && !selectedConversation,
  })

  const selectedUser = selectedConversation?.user || selectedUserData

  const getUserName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col px-4 sm:px-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('messages.title')}</h1>
        <p className="text-sm sm:text-base text-text-secondary">{t('messages.subtitle')}</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Conversations List */}
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border-soft">
            <h2 className="font-semibold text-text-main">{t('messages.conversations')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoadingConversations ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
                <p className="text-text-secondary">{t('messages.noConversations')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border-soft">
                {conversations.map((conversation: any) => (
                  <button
                    key={conversation.user.id}
                    onClick={() => setSelectedUserId(conversation.user.id)}
                    className={`w-full p-4 text-left hover:bg-surface transition-colors ${
                      selectedUserId === conversation.user.id ? 'bg-surface' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar
                          src={conversation.user.profile_picture}
                          name={getUserName(conversation.user)}
                          size="md"
                        />
                        {conversation.unread_count > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-light text-text-on-light text-xs flex items-center justify-center">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-main truncate">
                          {getUserName(conversation.user)}
                        </h3>
                        {conversation.last_message && (
                          <p className="text-sm text-text-secondary truncate">
                            {conversation.last_message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-border-soft flex items-center space-x-3">
                <Avatar
                  src={selectedUser?.profile_picture}
                  name={getUserName(selectedUser)}
                  size="md"
                />
                <div>
                  <h3 className="font-semibold text-text-main">
                    {getUserName(selectedUser)}
                  </h3>
                  <p className="text-sm text-text-secondary">{selectedUser?.email}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-text-secondary">{t('messages.noMessages')}</p>
                  </div>
                ) : (
                  messages.map((message: any) => {
                    const isOwn = message.sender.id === user?.id
                    const senderUser = isOwn ? user : selectedUser
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isOwn && (
                          <Avatar
                            src={senderUser?.profile_picture}
                            name={getUserName(senderUser)}
                            size="sm"
                            className="flex-shrink-0"
                          />
                        )}
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwn
                              ? 'bg-primary text-white'
                              : 'bg-surface text-text-main'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isOwn ? 'text-white/70' : 'text-text-secondary'
                            }`}
                          >
                            {format(new Date(message.created_at), 'HH:mm')}
                          </p>
                        </div>
                        {isOwn && (
                          <Avatar
                            src={senderUser?.profile_picture}
                            name={getUserName(senderUser)}
                            size="sm"
                            className="flex-shrink-0"
                          />
                        )}
                      </motion.div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-border-soft">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder={t('messages.typeMessage')}
                    className="flex-1 px-4 py-2 rounded-lg border border-border-soft bg-background text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!messageContent.trim() || sendMessageMutation.isPending}
                    className="px-6 py-2 rounded-lg bg-primary text-white hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
                <p className="text-text-secondary">{t('messages.selectConversation')}</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

