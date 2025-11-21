import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { friendshipAPI } from '../lib/api'
import Button from './Button'
import Input from './Input'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from './ErrorModal'
import { handleApiError } from '../utils/errorHandler'

interface AddFriendModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const queryClient = useQueryClient()
  const { isOpen: isErrorOpen, errorData, showError, hideError } = useErrorModal()

  const inviteMutation = useMutation({
    mutationFn: (email: string) => friendshipAPI.inviteByEmail(email),
    onSuccess: () => {
      setEmail('')
      onClose()
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      inviteMutation.mutate(email.trim())
    }
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
              <div className="bg-background rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-border-soft">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-text-secondary hover:text-text-main transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-main">
                      {t('addFriend.title')}
                    </h2>
                  </div>
                  <p className="text-text-secondary">
                    {t('addFriend.subtitle')}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label={t('addFriend.email')}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('addFriend.emailPlaceholder')}
                    required
                    disabled={inviteMutation.isPending}
                  />

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onClose}
                      disabled={inviteMutation.isPending}
                      className="flex-1"
                    >
                      {t('addFriend.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      disabled={inviteMutation.isPending || !email.trim()}
                      className="flex-1"
                    >
                      {inviteMutation.isPending
                        ? t('addFriend.sending')
                        : t('addFriend.send')}
                    </Button>
                  </div>
                </form>
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
    </>
  )
}





