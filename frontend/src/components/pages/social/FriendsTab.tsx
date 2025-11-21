import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, MessageCircle } from 'lucide-react'
import Card from '../../Card'
import UserDetailModal from './UserDetailModal'

interface User {
  id: number
  first_name?: string
  last_name?: string
  email: string
  profile_picture?: string | null
}

interface FriendsTabProps {
  friends: User[]
  isLoading: boolean
  getUserName: (user: User) => string
}

export default function FriendsTab({ friends, isLoading, getUserName }: FriendsTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedFriend, setSelectedFriend] = useState<User | null>(null)

  const handleFriendClick = (friend: User) => {
    setSelectedFriend(friend)
  }

  const handleSendMessage = (userId: number) => {
    navigate('/messages', { state: { userId } })
    setSelectedFriend(null) // Close modal after navigation
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : friends.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
            <p className="text-text-secondary">{t('social.noFriends')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((friend: User) => (
              <button
                key={friend.id}
                onClick={() => handleFriendClick(friend)}
                className="text-left w-full"
              >
                <Card className="p-4 cursor-pointer hover:bg-surface/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-main truncate">
                        {getUserName(friend)}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">{friend.email}</p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <UserDetailModal
        isOpen={selectedFriend !== null}
        user={selectedFriend}
        onClose={() => setSelectedFriend(null)}
        onAction={handleSendMessage}
        isPending={false}
        getUserName={getUserName}
        actionButtonText={t('messages.title')}
        actionButtonIcon={MessageCircle}
      />
    </>
  )
}


