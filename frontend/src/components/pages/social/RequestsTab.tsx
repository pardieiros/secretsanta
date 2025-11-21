import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Check } from 'lucide-react'
import { friendshipAPI } from '../../../lib/api'
import Card from '../../Card'
import UserDetailModal from './UserDetailModal'
import { useErrorModal } from '../../../hooks/useErrorModal'
import ErrorModal from '../../ErrorModal'
import { handleApiError } from '../../../utils/errorHandler'

interface User {
  id: number
  first_name?: string
  last_name?: string
  email: string
  profile_picture?: string | null
}

interface FriendRequest {
  id: number
  requester: User
  status: string
}

interface RequestsTabProps {
  pendingRequests: FriendRequest[]
  isLoading: boolean
  getUserName: (user: User) => string
}

export default function RequestsTab({
  pendingRequests,
  isLoading,
  getUserName,
}: RequestsTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isOpen, errorData, showError, hideError } = useErrorModal()
  const [selectedRequest, setSelectedRequest] = useState<FriendRequest | null>(null)

  // Accept friend request
  const acceptMutation = useMutation({
    mutationFn: (friendshipId: number) => friendshipAPI.accept(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
      queryClient.invalidateQueries({ queryKey: ['friends', 'list'] })
      setSelectedRequest(null) // Close modal after successful acceptance
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const handleRequestClick = (request: FriendRequest) => {
    setSelectedRequest(request)
  }

  const handleAccept = (userId: number) => {
    if (selectedRequest) {
      acceptMutation.mutate(selectedRequest.id)
    }
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
        ) : pendingRequests.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
            <p className="text-text-secondary">{t('social.noRequests')}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request: FriendRequest) => (
              <button
                key={request.id}
                onClick={() => handleRequestClick(request)}
                className="text-left w-full"
              >
                <Card className="p-4 cursor-pointer hover:bg-surface/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-main truncate">
                        {getUserName(request.requester)}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">{request.requester?.email}</p>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </motion.div>

      <UserDetailModal
        isOpen={selectedRequest !== null}
        user={selectedRequest?.requester || null}
        onClose={() => setSelectedRequest(null)}
        onAction={handleAccept}
        isPending={acceptMutation.isPending}
        getUserName={getUserName}
        actionButtonText={t('social.acceptRequest')}
        actionButtonIcon={Check}
        pendingText={t('social.accepting')}
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


