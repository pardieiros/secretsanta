import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { messageAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import ConversationsList from '../components/pages/messages/ConversationsList'
import ChatArea from '../components/pages/messages/ChatArea'

export default function Messages() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    location.state?.userId || null
  )
  const queryClient = useQueryClient()

  // Get conversations
  const { data: conversationsData, isLoading: isLoadingConversations } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageAPI.getConversations(),
    refetchInterval: false, // Disable polling, use WebSockets instead
  })

  // Handle paginated response
  const conversations = conversationsData?.results || conversationsData || []
  const selectedConversation = conversations.find((c: any) => c.user.id === selectedUserId)

  // Update selectedUserId when location.state changes
  useEffect(() => {
    if (location.state?.userId) {
      setSelectedUserId(location.state.userId)
    }
  }, [location.state])

  const handleSelectConversation = (userId: number) => {
    setSelectedUserId(userId)
  }

  const handleBack = () => {
    setSelectedUserId(null)
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col px-4 sm:px-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('messages.title')}</h1>
        <p className="text-sm sm:text-base text-text-secondary">{t('messages.subtitle')}</p>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 overflow-hidden">
        {/* Conversations List - Hidden on mobile when chat is open, always visible on desktop */}
        <div className={selectedUserId ? 'hidden lg:block min-h-0 overflow-hidden' : 'block min-h-0 overflow-hidden'}>
          <ConversationsList
            conversations={conversations}
            selectedUserId={selectedUserId}
            onSelectConversation={handleSelectConversation}
            isLoading={isLoadingConversations}
          />
        </div>

        {/* Chat Area - Full width on mobile when open, normal width on desktop, always visible on desktop */}
        <div className={selectedUserId ? 'block lg:col-span-2 min-h-0 overflow-hidden' : 'hidden lg:block lg:col-span-2 min-h-0 overflow-hidden'}>
          <ChatArea
            selectedUserId={selectedUserId}
            selectedConversation={selectedConversation}
            currentUser={user}
            onBack={handleBack}
            showBackButton={!!selectedUserId}
          />
        </div>
      </div>
    </div>
  )
}

