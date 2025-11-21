import { useEffect, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LucideIcon } from 'lucide-react'
import Avatar from '../../Avatar'
import Button from '../../Button'

interface User {
  id: number
  first_name?: string
  last_name?: string
  email: string
  profile_picture?: string | null
}

interface UserDetailModalProps {
  isOpen: boolean
  user: User | null
  onClose: () => void
  onAction: (userId: number) => void
  isPending?: boolean
  getUserName: (user: User) => string
  actionButtonText: string
  actionButtonIcon?: LucideIcon
  pendingText?: string
}

export default function UserDetailModal({
  isOpen,
  user,
  onClose,
  onAction,
  isPending = false,
  getUserName,
  actionButtonText,
  actionButtonIcon: ActionIcon,
  pendingText,
}: UserDetailModalProps) {
  const { t } = useTranslation()

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !user) return null

  return (
    <AnimatePresence>
      {isOpen && user && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative bg-background rounded-xl shadow-2xl max-w-md w-full p-6 border border-border-soft"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-text-secondary hover:text-text-main transition-colors p-2 hover:bg-surface rounded-lg"
                aria-label={t('nav.close')}
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div className="mt-2">
                  <Avatar
                    src={user.profile_picture}
                    name={getUserName(user)}
                    size="xl"
                  />
                </div>

                {/* Name */}
                <div>
                  <h2 className="text-2xl font-bold text-text-main">
                    {getUserName(user)}
                  </h2>
                </div>

                {/* Email */}
                <div>
                  <p className="text-text-secondary">{user.email}</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 w-full pt-4">
                  <Button
                    variant="secondary"
                    onClick={onClose}
                    disabled={isPending}
                    className="flex-1"
                  >
                    {t('addFriend.cancel')}
                  </Button>
                  <Button
                    onClick={() => onAction(user.id)}
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    {ActionIcon && <ActionIcon className="w-4 h-4" />}
                    {isPending ? (pendingText || t('addFriend.sending')) : actionButtonText}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

