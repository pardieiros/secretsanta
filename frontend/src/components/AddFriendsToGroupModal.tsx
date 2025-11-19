import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, UserPlus, CheckCircle, Mail } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { friendshipAPI, groupAPI } from '../lib/api'
import Button from './Button'
import Avatar from './Avatar'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from './ErrorModal'
import { handleApiError } from '../utils/errorHandler'

interface AddFriendsToGroupModalProps {
  isOpen: boolean
  onClose: () => void
  groupId: number
  currentMemberIds: number[]
}

export default function AddFriendsToGroupModal({
  isOpen,
  onClose,
  groupId,
  currentMemberIds,
}: AddFriendsToGroupModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isOpen: isErrorOpen, errorData, showError, hideError } = useErrorModal()
  const [successModal, setSuccessModal] = useState<{ isOpen: boolean; friendName: string }>({
    isOpen: false,
    friendName: '',
  })

  // Get friends
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery({
    queryKey: ['friends', 'list'],
    queryFn: () => friendshipAPI.getFriends(),
  })

  // Filter out friends who are already members
  const availableFriends = friends.filter(
    (friend: any) => !currentMemberIds.includes(friend.id)
  )

  // Add friend to group mutation
  const addFriendMutation = useMutation({
    mutationFn: (email: string) => groupAPI.sendInviteEmail(groupId, email),
    onSuccess: (_, email) => {
      const friend = availableFriends.find((f: any) => f.email === email)
      if (friend) {
        setSuccessModal({
          isOpen: true,
          friendName: getUserName(friend),
        })
      }
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const handleAddFriend = (friend: any) => {
    addFriendMutation.mutate(friend.email)
  }

  const handleCloseSuccessModal = () => {
    setSuccessModal({ isOpen: false, friendName: '' })
  }

  const getUserName = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.email
  }

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-border-soft">
                {/* Header */}
                <div className="p-6 border-b border-border-soft flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-text-main">
                        {t('groupDetail.addFriendsToGroup')}
                      </h2>
                      <p className="text-sm text-text-secondary">
                        {t('groupDetail.addFriendsToGroupSubtitle')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-text-main transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Friends List */}
                <div className="flex-1 overflow-y-auto p-6">
                  {isLoadingFriends ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : availableFriends.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
                      <p className="text-text-secondary">
                        {t('groupDetail.noFriendsToAdd')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableFriends.map((friend: any) => (
                        <div
                          key={friend.id}
                          className="flex items-center justify-between p-4 bg-surface rounded-lg hover:bg-surface/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar
                              src={friend.profile_picture}
                              name={getUserName(friend)}
                              size="md"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-text-main truncate">
                                {getUserName(friend)}
                              </p>
                              <p className="text-sm text-text-secondary truncate">
                                {friend.email}
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddFriend(friend)}
                            disabled={addFriendMutation.isPending}
                            className="flex items-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            {t('groupDetail.addToGroup')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border-soft">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    className="w-full"
                  >
                    {t('groupDetail.close')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ErrorModal
        isOpen={isErrorOpen}
        onClose={hideError}
        title={errorData.title}
        message={errorData.message}
        errors={errorData.errors}
      />

      {/* Success Modal */}
      <AnimatePresence>
        {successModal.isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[60]"
              onClick={handleCloseSuccessModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-background rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-border-soft">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-text-main mb-2">
                    {t('groupDetail.invitationSent')}
                  </h3>
                  <p className="text-text-secondary mb-6">
                    {t('groupDetail.invitationSentMessage', { name: successModal.friendName })}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-text-secondary mb-6 p-4 bg-surface rounded-lg">
                    <Mail className="w-5 h-5" />
                    <span>{t('groupDetail.emailAndNotificationSent')}</span>
                  </div>
                  <Button onClick={handleCloseSuccessModal} className="w-full">
                    {t('groupDetail.close')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

