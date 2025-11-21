import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Send, MessageCircle, ArrowLeft } from 'lucide-react'
import { messageAPI, userAPI } from '../../../lib/api'
import { useQuery } from '@tanstack/react-query'
import Avatar from '../../Avatar'
import Card from '../../Card'
import { format } from 'date-fns'
import { useChannel } from '../../../hooks/useChannel'

interface User {
  id: number
  first_name?: string
  last_name?: string
  email: string
  profile_picture?: string | null
}

interface Conversation {
  user: User
}

interface ChatAreaProps {
  selectedUserId: number | null
  selectedConversation?: Conversation
  currentUser: User | null
  onBack?: () => void
  showBackButton?: boolean
}

export default function ChatArea({
  selectedUserId,
  selectedConversation,
  currentUser,
  onBack,
  showBackButton = false,
}: ChatAreaProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)

  // Get messages for selected user with infinite scroll
  // Django pagination returns messages ordered by -created_at (newest first)
  // We load page 1 first (newest 20), then page 2, 3, etc. when scrolling up
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: ({ pageParam = 1 }) => messageAPI.list(selectedUserId!, pageParam),
    enabled: selectedUserId !== null,
    getNextPageParam: (lastPage: any, allPages) => {
      // Check if there's a next page (next means older messages in this context)
      // Since Django returns newest first, "next" in the response means older messages
      if (lastPage.next) {
        // Extract page number from next URL
        try {
          const nextUrl = lastPage.next
          // Handle both absolute and relative URLs
          const urlObj = nextUrl.startsWith('http') 
            ? new URL(nextUrl) 
            : new URL(nextUrl, window.location.origin)
          const pageParam = urlObj.searchParams.get('page')
          if (pageParam) {
            return parseInt(pageParam, 10)
          }
        } catch (e) {
          // If URL parsing fails, calculate next page number
          console.warn('Failed to parse next URL:', e)
        }
        // Fallback: calculate next page number
        return allPages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
    refetchInterval: false, // Disable polling, use WebSockets instead
  })

  // Listen for new messages via WebSocket
  useChannel(
    currentUser ? `private-user-${currentUser.id}` : '',
    'new-message',
    useCallback((data: any) => {
      // Only add message if it's for the current conversation
      if (data.receiver_id === currentUser?.id && data.sender_id === selectedUserId) {
        queryClient.setQueryData(['messages', selectedUserId], (oldData: any) => {
          if (!oldData) return oldData
          
          // Check if message already exists
          const allMessages = oldData.pages.flatMap((page: any) => page.results || page || [])
          const messageExists = allMessages.some((m: any) => m.id === data.id)
          
          if (messageExists) return oldData
          
          // Add new message to the first page
          const newPages = [...oldData.pages]
          if (newPages[0]?.results) {
            newPages[0] = {
              ...newPages[0],
              results: [data, ...newPages[0].results],
            }
          } else {
            newPages[0] = {
              results: [data],
              count: (newPages[0]?.count || 0) + 1,
            }
          }
          
          return {
            ...oldData,
            pages: newPages,
          }
        })
        setShouldScrollToBottom(true)
        // Invalidate conversations to update unread count
        queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
      }
    }, [currentUser?.id, selectedUserId, queryClient])
  )

  // Flatten all messages from all pages
  // Django returns newest first, so we need to reverse to show oldest first in UI
  const allMessages = data?.pages.flatMap((page: any) => page.results || page || []) || []
  
  // Sort messages by created_at (oldest first) for display
  const messages = [...allMessages].sort((a: any, b: any) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  // Check if there are more pages to load (older messages)
  const hasMorePages = hasNextPage

  // Mark messages as read when viewing
  const markAllReadMutation = useMutation({
    mutationFn: (userId: number) => messageAPI.markAllRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
    },
  })

  // Get user info if userId is passed but no conversation exists
  const { data: selectedUserData } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: () => userAPI.getUser(selectedUserId!),
    enabled: selectedUserId !== null && !selectedConversation,
  })

  const selectedUser = selectedConversation?.user || selectedUserData

  // Mark messages as read when viewing
  useEffect(() => {
    if (selectedUserId && messages.length > 0) {
      const unreadMessages = messages.filter(
        (m: any) => !m.is_read && m.sender.id !== currentUser?.id
      )
      if (unreadMessages.length > 0) {
        markAllReadMutation.mutate(selectedUserId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, messages])

  // Scroll to bottom on initial load or when new messages are sent
  useEffect(() => {
    if (isInitialLoad && messages.length > 0) {
      // Initial load - scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        setIsInitialLoad(false)
      }, 100)
    } else if (shouldScrollToBottom && messages.length > 0) {
      // New message sent - scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        setShouldScrollToBottom(false)
      }, 100)
    }
  }, [messages, isInitialLoad, shouldScrollToBottom])

  // Handle scroll to detect when user scrolls to top to load more messages
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // If user scrolls near the top (within 100px), load more older messages
    if (scrollTop < 100 && hasMorePages && !isFetchingNextPage && !isInitialLoad) {
      // Save current scroll position and the first message ID for reference
      const previousScrollHeight = scrollHeight
      
      fetchNextPage().then(() => {
        // After loading older messages, adjust scroll position to maintain view
        // This prevents jump when new messages are added above
        setTimeout(() => {
          const newScrollHeight = container.scrollHeight
          const heightDifference = newScrollHeight - previousScrollHeight
          container.scrollTop = scrollTop + heightDifference
        }, 50)
      })
    }
  }, [hasMorePages, isFetchingNextPage, fetchNextPage, isInitialLoad])

  // Reset initial load state when conversation changes
  useEffect(() => {
    setIsInitialLoad(true)
    setShouldScrollToBottom(false)
  }, [selectedUserId])

  // Send message
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => messageAPI.send(selectedUserId!, content),
    onSuccess: () => {
      setShouldScrollToBottom(true)
      // Refetch to get new messages
      refetch()
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] })
    },
  })

  const [inputValue, setInputValue] = useState('')

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && selectedUserId) {
      sendMessageMutation.mutate(inputValue.trim())
      setInputValue('')
    }
  }

  const getUserName = (user: User | null | undefined) => {
    if (!user) return ''
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.email || ''
  }

  return (
    <Card className="lg:col-span-2 flex flex-col overflow-hidden h-full max-h-full">
      {selectedUserId && selectedUser ? (
        <>
          {/* Chat Header */}
          <div className="p-4 border-b border-border-soft flex items-center space-x-3 flex-shrink-0">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="lg:hidden mr-2 p-2 rounded-lg hover:bg-surface transition-colors text-text-main"
                aria-label={t('nav.back')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <Avatar
              src={selectedUser.profile_picture}
              name={getUserName(selectedUser)}
              size="md"
              className="flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-text-main truncate">
                {getUserName(selectedUser)}
              </h3>
              <p className="text-sm text-text-secondary truncate">{selectedUser.email}</p>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
          >
            {isLoadingMessages && isInitialLoad ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Loading indicator when fetching older messages */}
                {isFetchingNextPage && (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                  </div>
                )}
                
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-text-secondary">{t('messages.noMessages')}</p>
                  </div>
                ) : (
                  messages.map((message: any) => {
                const isOwn = message.sender.id === currentUser?.id
                const senderUser = isOwn ? currentUser : selectedUser
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
                        isOwn ? 'bg-primary text-white' : 'bg-surface text-text-main'
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
              </>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border-soft flex-shrink-0">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={t('messages.typeMessage')}
                className="flex-1 px-4 py-2 rounded-lg border border-border-soft bg-background text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || sendMessageMutation.isPending}
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
  )
}

