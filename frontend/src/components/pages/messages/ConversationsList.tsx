import { useTranslation } from 'react-i18next'
import { MessageCircle } from 'lucide-react'
import Card from '../../Card'
import Avatar from '../../Avatar'

interface User {
  id: number
  first_name?: string
  last_name?: string
  email: string
  profile_picture?: string | null
}

interface Conversation {
  user: User
  unread_count: number
  last_message?: {
    content: string
    created_at: string
  }
}

interface ConversationsListProps {
  conversations: Conversation[]
  selectedUserId: number | null
  onSelectConversation: (userId: number) => void
  isLoading: boolean
}

export default function ConversationsList({
  conversations,
  selectedUserId,
  onSelectConversation,
  isLoading,
}: ConversationsListProps) {
  const { t } = useTranslation()

  const getUserName = (user: User) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.email || ''
  }

  return (
    <Card className="lg:col-span-1 overflow-hidden flex flex-col h-full max-h-full">
      <div className="p-4 border-b border-border-soft flex-shrink-0">
        <h2 className="font-semibold text-text-main">{t('messages.conversations')}</h2>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
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
            {conversations.map((conversation) => (
              <button
                key={conversation.user.id}
                onClick={() => onSelectConversation(conversation.user.id)}
                className={`w-full p-4 text-left hover:bg-surface transition-colors ${
                  selectedUserId === conversation.user.id ? 'bg-surface' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    <Avatar
                      src={conversation.user.profile_picture}
                      name={getUserName(conversation.user)}
                      size="md"
                    />
                    {conversation.unread_count > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-light text-text-on-light text-xs flex items-center justify-center">
                        {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
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
  )
}

