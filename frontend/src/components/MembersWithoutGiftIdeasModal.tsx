import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift } from 'lucide-react'
import Avatar from './Avatar'

interface MembersWithoutGiftIdeasModalProps {
  isOpen: boolean
  onClose: () => void
  members: any[]
}

export default function MembersWithoutGiftIdeasModal({
  isOpen,
  onClose,
  members,
}: MembersWithoutGiftIdeasModalProps) {
  const { t } = useTranslation()

  const getUserName = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.email
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl bg-background shadow-2xl border border-border-soft overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border-soft">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-warning/10 rounded-lg">
                      <Gift className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-text-main">
                        {t('groupDetail.missingGiftIdeasTitle')}
                      </h2>
                      <p className="text-sm text-text-secondary mt-1">
                        {t('groupDetail.missingGiftIdeasDescription')}
                      </p>
                    </div>
                  </div>
                    <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-surface transition-colors text-text-secondary hover:text-text-main"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-surface rounded-lg"
                    >
                      <Avatar
                        src={member.profile_picture}
                        name={getUserName(member)}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-main truncate">
                          {getUserName(member)}
                        </p>
                        <p className="text-sm text-text-secondary truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border-soft">
                <button
                  onClick={onClose}
                  className="w-full bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-light transition-colors"
                >
                  {t('groupDetail.understood')}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

