import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Send, MessageCircle, ArrowLeft, CheckCheck } from 'lucide-react'
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

interface PendingMessage {
  id: string // Temporary ID
  content: string
  created_at: string
  is_sending: boolean
  is_sent: boolean
  sender: User
  receiver: User
}

interface ChatAreaProps {
  selectedUserId: number | null
  selectedConversation?: Conversation
  currentUser: User | null
  onBack?: () => void
  showBackButton?: boolean
}

interface MessageItemProps {
  message: any
  isOwn: boolean
  senderUser: User | null | undefined
  currentUser: User | null
  getUserName: (user: User | null | undefined) => string
  shouldAnimate: boolean
}

// Memoized Typing Indicator Component - extracted to prevent re-renders
const TypingIndicator = memo(() => {
  return (
    <div className="flex items-center gap-1 px-4 py-2 bg-surface rounded-lg min-w-[60px]">
      <div className="flex gap-1 items-center">
        <motion.div
          className="w-2 h-2 bg-text-secondary rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-text-secondary rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-text-secondary rounded-full"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  )
})
TypingIndicator.displayName = 'TypingIndicator'

// Memoized Message Item Component - extracted to prevent unnecessary re-renders
const MessageItem = memo(({ 
  message, 
  isOwn, 
  senderUser, 
  getUserName,
  shouldAnimate 
}: MessageItemProps) => {
  const isPending = message.is_pending

  // Determine background color based on state
  // For own messages: always green (dark green) if it's our message
  const backgroundColor = !isOwn
    ? 'bg-surface text-text-main'
    : 'bg-green-600 text-white' // Always green (dark) for our own messages

  // Only animate if this is a new message (shouldAnimate is true)
  const content = (
    <div className={`flex items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && (
        <Avatar
          src={senderUser?.profile_picture}
          name={getUserName(senderUser)}
          size="sm"
          className="flex-shrink-0"
        />
      )}
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 relative ${backgroundColor}`}
      >
        <p className="text-sm">{message.content}</p>
        <div className="flex items-center gap-1 mt-1">
          <p
            className={`text-xs ${
              isOwn ? 'text-white/70' : 'text-text-secondary'
            }`}
          >
            {format(new Date(message.created_at), 'HH:mm')}
          </p>
          {isOwn && (
            <CheckCheck className="w-3 h-3 text-white/70" />
          )}
        </div>
      </div>
      {isOwn && (
        <Avatar
          src={senderUser?.profile_picture}
          name={getUserName(senderUser)}
          size="sm"
          className="flex-shrink-0"
        />
      )}
    </div>
  )

  // Only wrap in motion.div if shouldAnimate (new message)
  if (shouldAnimate && isPending) {
    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {content}
      </motion.div>
    )
  }

  return <div key={message.id}>{content}</div>
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent re-renders
  // Return true if props are equal (skip re-render), false if different (re-render)
  // IMPORTANT: When is_sent changes from false to true, we WANT to re-render to show green
  const propsEqual = (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.is_sending === nextProps.message.is_sending &&
    prevProps.message.is_sent === nextProps.message.is_sent &&
    prevProps.message.is_pending === nextProps.message.is_pending &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.shouldAnimate === nextProps.shouldAnimate
  )
  // If props changed, return false to allow re-render (especially for is_sent state change)
  return propsEqual
})
MessageItem.displayName = 'MessageItem'

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
  const hasMarkedAsReadRef = useRef<number | null>(null)
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEventRef = useRef<number>(0)
  const pendingMessageIdCounter = useRef(0)
  // Track which messages should be animated (new ones only)
  const animatedMessageIdsRef = useRef<Set<string | number>>(new Set())

  // Get messages for selected user with infinite scroll
  // Backend returns messages ordered by -created_at (newest first)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMessages,
  } = useInfiniteQuery({
    queryKey: ['messages', selectedUserId],
    queryFn: ({ pageParam = 1 }) => messageAPI.list(selectedUserId!, pageParam),
    enabled: selectedUserId !== null,
    getNextPageParam: (lastPage: any, allPages) => {
      if (lastPage.next) {
        try {
          const nextUrl = lastPage.next
          const urlObj = nextUrl.startsWith('http') 
            ? new URL(nextUrl) 
            : new URL(nextUrl, window.location.origin)
          const pageParam = urlObj.searchParams.get('page')
          if (pageParam) {
            return parseInt(pageParam, 10)
          }
        } catch (e) {
          console.warn('Failed to parse next URL:', e)
        }
        return allPages.length + 1
      }
      return undefined
    },
    initialPageParam: 1,
    refetchInterval: false,
  })

  // Memoized function to normalize WebSocket message
  const normalizeWebSocketMessage = useCallback((data: any) => {
    return {
      id: data.id,
      content: data.content,
      created_at: data.created_at,
      is_read: data.is_read !== undefined ? data.is_read : false,
      sender: data.sender || (data.sender_id ? {
        id: data.sender_id,
        email: '',
        first_name: data.sender_name?.split(' ')[0] || '',
        last_name: data.sender_name?.split(' ').slice(1).join(' ') || '',
        profile_picture: null,
      } : null),
      receiver: data.receiver || (data.receiver_id ? {
        id: data.receiver_id,
        email: '',
        first_name: '',
        last_name: '',
        profile_picture: null,
      } : null),
    }
  }, [])

  // Optimized: Memoized WebSocket handler for new messages
  const handleNewMessage = useCallback((data: any) => {
    // Handle messages received from others
    if (data.receiver_id === currentUser?.id && data.sender_id === selectedUserId) {
      queryClient.setQueryData(['messages', selectedUserId], (oldData: any) => {
        if (!oldData) return oldData
        
        // Check if message already exists - optimize with early return
        const allMessages = oldData.pages.flatMap((page: any) => page.results || page || [])
        const messageExists = allMessages.some((m: any) => m.id === data.id)
        
        if (messageExists) return oldData
        
        const normalizedMessage = normalizeWebSocketMessage(data)
        
        if (!normalizedMessage.sender) {
          return oldData
        }
        
        // Mark message as animated
        animatedMessageIdsRef.current.add(data.id)
        
        // Add new message to the first page - more efficient update
        const newPages = [...oldData.pages]
        if (newPages[0]?.results) {
          newPages[0] = {
            ...newPages[0],
            results: [normalizedMessage, ...newPages[0].results],
          }
        } else {
          newPages[0] = {
            results: [normalizedMessage],
            count: (newPages[0]?.count || 0) + 1,
          }
        }
        
        return {
          ...oldData,
          pages: newPages,
        }
      })
      setShouldScrollToBottom(true)
      // Debounce invalidation - only invalidate conversations list, not all queries
      queryClient.invalidateQueries({ 
        queryKey: ['messages', 'conversations'],
        exact: false 
      })
    }
    
    // Handle messages we sent - update corresponding pending message
    if (data.sender_id === currentUser?.id && data.receiver_id === selectedUserId) {
      // Update pending message to sent state - show green for at least 2 seconds
      setPendingMessages(prev => prev.map(pm => {
        const pmTime = new Date(pm.created_at).getTime()
        const msgTime = new Date(data.created_at).getTime()
        const timeDiff = Math.abs(pmTime - msgTime)
        const matches = pm.content === data.content && timeDiff < 10000
        
        if (matches) {
          return {
            ...pm,
            is_sending: false,
            is_sent: true,
            id: data.id.toString(),
            created_at: data.created_at,
          }
        }
        return pm
      }))
      
      // Update query cache - add message with is_sent flag for our own messages
      queryClient.setQueryData(['messages', selectedUserId], (oldData: any) => {
        if (!oldData) return oldData
        
        const allMessages = oldData.pages.flatMap((page: any) => page.results || page || [])
        const messageExists = allMessages.some((m: any) => m.id === data.id)
        
        if (messageExists) {
          // Message already in cache - mark it as sent and remove pending after delay
          // This ensures the real message shows green before pending is removed
          const updatedPages = oldData.pages.map((page: any) => {
            if (page.results) {
              const updatedResults = page.results.map((m: any) => {
                if (m.id === data.id && m.sender?.id === currentUser?.id) {
                  return { ...m, is_sent: true, _was_pending: true }
                }
                return m
              })
              return { ...page, results: updatedResults }
            }
            return page
          })
          
          // Remove pending after showing green state
          setTimeout(() => {
            setPendingMessages(prev => prev.filter(pm => {
              const pmTime = new Date(pm.created_at).getTime()
              const msgTime = new Date(data.created_at).getTime()
              const timeDiff = Math.abs(pmTime - msgTime)
              return !(pm.content === data.content && timeDiff < 10000 && pm.is_sent)
            }))
            
            // Also remove the temporary is_sent flag from cache after pending is removed
            queryClient.setQueryData(['messages', selectedUserId], (oldData: any) => {
              if (!oldData) return oldData
              const cleanedPages = oldData.pages.map((page: any) => {
                if (page.results) {
                  const cleanedResults = page.results.map((m: any) => {
                    if (m._was_pending) {
                      const { _was_pending, ...rest } = m
                      return rest
                    }
                    return m
                  })
                  return { ...page, results: cleanedResults }
                }
                return page
              })
              return { ...oldData, pages: cleanedPages }
            })
          }, 2500) // Give 2.5 seconds to show green state
          
          return { ...oldData, pages: updatedPages }
        }
        
        const normalizedMessage = normalizeWebSocketMessage(data)
        
        if (!normalizedMessage.sender) {
          return oldData
        }
        
        // Mark as sent if it's our own message - create new object with is_sent flag
        const messageWithSentFlag = normalizedMessage.sender.id === currentUser?.id
          ? { ...normalizedMessage, is_sent: true, _was_pending: true as any }
          : normalizedMessage
        
        const newPages = [...oldData.pages]
        if (newPages[0]?.results) {
          newPages[0] = {
            ...newPages[0],
            results: [messageWithSentFlag, ...newPages[0].results],
          }
        } else {
          newPages[0] = {
            results: [messageWithSentFlag],
            count: (newPages[0]?.count || 0) + 1,
          }
        }
        
        // Remove pending message after message is in cache and green state is shown
        setTimeout(() => {
          setPendingMessages(prev => prev.filter(pm => {
            const pmTime = new Date(pm.created_at).getTime()
            const msgTime = new Date(data.created_at).getTime()
            const timeDiff = Math.abs(pmTime - msgTime)
            return !(pm.content === data.content && timeDiff < 10000 && pm.is_sent)
          }))
          
          // Clean up temporary flag
          queryClient.setQueryData(['messages', selectedUserId], (oldData: any) => {
            if (!oldData) return oldData
            const cleanedPages = oldData.pages.map((page: any) => {
              if (page.results) {
                const cleanedResults = page.results.map((m: any) => {
                  if (m._was_pending) {
                    const { _was_pending, ...rest } = m
                    return rest
                  }
                  return m
                })
                return { ...page, results: cleanedResults }
              }
              return page
            })
            return { ...oldData, pages: cleanedPages }
          })
        }, 2500) // Give 2.5 seconds to show green state
        
        return {
          ...oldData,
          pages: newPages,
        }
      })
      
      setShouldScrollToBottom(true)
      queryClient.invalidateQueries({ 
        queryKey: ['messages', 'conversations'],
        exact: false 
      })
    }
  }, [currentUser?.id, selectedUserId, queryClient, normalizeWebSocketMessage])

  // Listen for new messages via WebSocket
  useChannel(
    currentUser ? `private-user-${currentUser.id}` : '',
    'new-message',
    handleNewMessage
  )

  // Optimized: Memoized typing indicator handler
  const handleTypingIndicator = useCallback((data: any) => {
    if (data.sender_id === selectedUserId && data.receiver_id === currentUser?.id) {
      setIsTyping(true)
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Hide typing indicator after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
      }, 3000)
    }
  }, [selectedUserId, currentUser?.id])

  // Listen for typing indicators
  useChannel(
    currentUser ? `private-user-${currentUser.id}` : '',
    'user-typing',
    handleTypingIndicator
  )

  // Optimized: Throttled typing indicator sender
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!selectedUserId || !currentUser) return
    
    const now = Date.now()
    // Throttle typing events to max once per second
    if (isTyping && now - lastTypingEventRef.current < 1000) {
      return
    }
    lastTypingEventRef.current = now

    messageAPI.sendTypingIndicator(selectedUserId, isTyping).catch((error) => {
      console.error('Failed to send typing indicator:', error)
    })
  }, [selectedUserId, currentUser])

  // OPTIMIZATION: Memoize flattened messages to avoid recalculating on every render
  const allMessages = useMemo(() => {
    return data?.pages.flatMap((page: any) => page.results || page || []) || []
  }, [data?.pages])

  // OPTIMIZATION: Memoize sorted messages - only recalculate when allMessages changes
  const sortedMessages = useMemo(() => {
    // Backend returns newest first, so we sort to show oldest first
    return [...allMessages].sort((a: any, b: any) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }, [allMessages])

  // OPTIMIZATION: Memoize pending messages formatting
  const pendingMessagesFormatted = useMemo(() => {
    return pendingMessages
      .filter(pm => {
        // Don't show pending if we already have the real message
        const realMessageExists = sortedMessages.some(m => {
          const pmTime = new Date(pm.created_at).getTime()
          const msgTime = new Date(m.created_at).getTime()
          const timeDiff = Math.abs(pmTime - msgTime)
          return m.content === pm.content && timeDiff < 10000
        })
        return !realMessageExists
      })
      .map(pm => ({
        ...pm,
        is_pending: true,
        is_sending: pm.is_sending,
        is_sent: pm.is_sent,
      }))
  }, [pendingMessages, sortedMessages])

  // OPTIMIZATION: Memoize final merged list - only recalculate when dependencies change
  const allMessagesWithPending = useMemo(() => {
    return [
      ...sortedMessages,
      ...pendingMessagesFormatted
    ].sort((a: any, b: any) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return aTime - bTime
    })
  }, [sortedMessages, pendingMessagesFormatted])

  // Mark messages as read when viewing
  const markAllReadMutation = useMutation({
    mutationFn: (userId: number) => messageAPI.markAllRead(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['messages', 'conversations'],
        exact: false 
      })
      if (selectedUserId) {
        hasMarkedAsReadRef.current = selectedUserId
      }
    },
  })

  // Get user info if userId is passed but no conversation exists
  const { data: selectedUserData } = useQuery({
    queryKey: ['user', selectedUserId],
    queryFn: () => userAPI.getUser(selectedUserId!),
    enabled: selectedUserId !== null && !selectedConversation,
  })

  const selectedUser = selectedConversation?.user || selectedUserData

  // Memoized getUserName function
  const getUserName = useCallback((user: User | null | undefined) => {
    if (!user) return ''
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.email || ''
  }, [])

  // Mark messages as read when viewing - optimized to check only when needed
  useEffect(() => {
    if (selectedUserId !== hasMarkedAsReadRef.current) {
      hasMarkedAsReadRef.current = null
    }

    if (
      selectedUserId && 
      sortedMessages.length > 0 && 
      !markAllReadMutation.isPending &&
      hasMarkedAsReadRef.current !== selectedUserId
    ) {
      // OPTIMIZATION: Use a more efficient check for unread messages
      const hasUnreadMessages = sortedMessages.some(
        (m: any) => !m.is_read && (m.sender?.id || m.sender_id) !== currentUser?.id
      )
      
      if (hasUnreadMessages) {
        markAllReadMutation.mutate(selectedUserId)
      }
    }
  }, [selectedUserId, sortedMessages.length, markAllReadMutation, currentUser?.id])

  // OPTIMIZATION: Improved scroll behavior with requestAnimationFrame
  useEffect(() => {
    if (isInitialLoad && (sortedMessages.length > 0 || pendingMessages.length > 0)) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
        setIsInitialLoad(false)
      })
    } else if (shouldScrollToBottom) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        setShouldScrollToBottom(false)
      })
    }
  }, [sortedMessages.length, pendingMessages.length, isInitialLoad, shouldScrollToBottom])
  
  // Scroll to bottom when typing indicator appears
  useEffect(() => {
    if (isTyping) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      })
    }
  }, [isTyping])

  // OPTIMIZATION: Throttled scroll handler to prevent excessive re-renders
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget
    
    // Throttle scroll handler
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTop = container.scrollTop
      const scrollHeight = container.scrollHeight
      const clientHeight = container.clientHeight

      // Check if user is near the bottom (within 200px)
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
      setShouldScrollToBottom(isNearBottom)

      // Load more messages when scrolling to top
      if (scrollTop < 100 && hasNextPage && !isFetchingNextPage && !isInitialLoad) {
        const previousScrollHeight = scrollHeight
        
        fetchNextPage().then(() => {
          requestAnimationFrame(() => {
            const newScrollHeight = container.scrollHeight
            const heightDifference = newScrollHeight - previousScrollHeight
            container.scrollTop = scrollTop + heightDifference
          })
        })
      }
    }, 100) // Throttle to 100ms
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isInitialLoad])

  // Reset state when conversation changes
  useEffect(() => {
    setIsInitialLoad(true)
    setShouldScrollToBottom(true)
    hasMarkedAsReadRef.current = null
    setPendingMessages([])
    setIsTyping(false)
    animatedMessageIdsRef.current.clear()
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [selectedUserId])

  // OPTIMIZATION: Removed refetch() - Soketi WebSocket will handle new message updates
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => messageAPI.send(selectedUserId!, content),
    onSuccess: () => {
      // WebSocket event will handle adding the message to cache
      // Only invalidate conversations list, not refetch all messages
      setShouldScrollToBottom(true)
      queryClient.invalidateQueries({ 
        queryKey: ['messages', 'conversations'],
        exact: false 
      })
    },
    onError: () => {
      // On error, mark pending message as failed
      setPendingMessages(prev => prev.map(pm => ({ 
        ...pm, 
        is_sending: false, 
        is_sent: false 
      })))
    },
  })

  const [inputValue, setInputValue] = useState('')

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && selectedUserId && currentUser && selectedUser) {
      const content = inputValue.trim()
      const tempId = `pending-${pendingMessageIdCounter.current++}`
      const now = new Date().toISOString()
      
      // Create pending message - show as sent (green) immediately when sent
      const pendingMessage: PendingMessage = {
        id: tempId,
        content,
        created_at: now,
        is_sending: false,
        is_sent: true, // Show as sent (green) immediately
        sender: currentUser,
        receiver: selectedUser,
      }
      
      // Mark as animated
      animatedMessageIdsRef.current.add(tempId)
      
      setPendingMessages(prev => [...prev, pendingMessage])
      setInputValue('')
      setShouldScrollToBottom(true)
      
      // Send message
      sendMessageMutation.mutate(content)
    }
  }, [inputValue, selectedUserId, currentUser, selectedUser, sendMessageMutation])

  // Handle input change for typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    
    if (e.target.value.trim() && selectedUserId) {
      sendTypingIndicator(true)
    }
  }, [selectedUserId, sendTypingIndicator])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

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
              <p className="text-sm text-text-secondary truncate">
                {isTyping ? t('messages.typing') : selectedUser.email}
              </p>
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
                
                {allMessagesWithPending.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-text-secondary">{t('messages.noMessages')}</p>
                  </div>
                ) : (
                  allMessagesWithPending.map((message: any) => {
                    const senderId = message.sender?.id || message.sender_id
                    const isOwn = senderId === currentUser?.id
                    const senderUser = isOwn ? currentUser : (message.sender || selectedUser)
                    const shouldAnimate = animatedMessageIdsRef.current.has(message.id)
                    
                    return (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isOwn={isOwn}
                        senderUser={senderUser}
                        currentUser={currentUser}
                        getUserName={getUserName}
                        shouldAnimate={shouldAnimate}
                      />
                    )
                  })
                )}
                
                <div ref={messagesEndRef} />
                
                {/* Typing Indicator - Always at the bottom */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-end gap-2 mt-4"
                  >
                    <Avatar
                      src={selectedUser.profile_picture}
                      name={getUserName(selectedUser)}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <TypingIndicator />
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border-soft flex-shrink-0">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
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