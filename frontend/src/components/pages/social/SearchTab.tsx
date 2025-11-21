import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Mail, UserPlus } from 'lucide-react'
import { friendshipAPI } from '../../../lib/api'
import Avatar from '../../Avatar'
import Card from '../../Card'
import Button from '../../Button'
import AddFriendModal from '../../AddFriendModal'
import UserDetailModal from './UserDetailModal'
import { useErrorModal } from '../../../hooks/useErrorModal'
import ErrorModal from '../../ErrorModal'
import { handleApiError } from '../../../utils/errorHandler'
import { useDebounce } from '../../../hooks/useDebounce'

interface User {
  id: number
  first_name?: string
  last_name?: string
  email: string
  profile_picture?: string | null
}

interface SearchTabProps {
  getUserName: (user: User) => string
}

export default function SearchTab({ getUserName }: SearchTabProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const queryClient = useQueryClient()
  const { isOpen, errorData, showError, hideError } = useErrorModal()

  // Debounce search query to avoid excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Search users
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['friends', 'search', debouncedSearchQuery],
    queryFn: () => friendshipAPI.search(debouncedSearchQuery),
    enabled: debouncedSearchQuery.length > 0,
  })

  // Send friend request
  const sendRequestMutation = useMutation({
    mutationFn: (userId: number) => friendshipAPI.sendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'search'] })
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
      setSelectedUser(null) // Close modal after successful request
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const handleUserClick = (user: User) => {
    setSelectedUser(user)
  }

  const handleAddFriend = (userId: number) => {
    sendRequestMutation.mutate(userId)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('social.searchPlaceholder')}
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-border-soft bg-background text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>
          <Button
            onClick={() => setShowAddFriendModal(true)}
            className="flex items-center justify-center gap-2 whitespace-nowrap sm:flex-shrink-0 w-full sm:w-auto"
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            <span>{t('social.inviteByEmail')}</span>
          </Button>
        </div>

        {isSearching ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : debouncedSearchQuery.length > 0 && searchResults.length === 0 ? (
          <Card className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
            <p className="text-text-secondary">{t('social.noResults')}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {searchResults.map((user: User) => (
              <button
                key={user.id}
                onClick={() => handleUserClick(user)}
                className="text-left w-full"
              >
                <Card className="p-4 cursor-pointer hover:bg-surface/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <Avatar
                      src={user.profile_picture}
                      name={getUserName(user)}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-main truncate">
                        {getUserName(user)}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">{user.email}</p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />

      <UserDetailModal
        isOpen={selectedUser !== null}
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onAction={handleAddFriend}
        isPending={sendRequestMutation.isPending}
        getUserName={getUserName}
        actionButtonText={t('social.addFriend')}
        actionButtonIcon={UserPlus}
        pendingText={t('addFriend.sending')}
      />

      <ErrorModal
        isOpen={isOpen}
        onClose={hideError}
        title={errorData.title}
        message={errorData.message}
        errors={errorData.errors}
      />
    </>
  )
}

