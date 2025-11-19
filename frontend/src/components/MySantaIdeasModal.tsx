import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gift } from 'lucide-react'

interface MySantaIdeasModalProps {
  isOpen: boolean
  onClose: () => void
  secretSanta: any
  ideas: any[]
  isLoading?: boolean
}

export default function MySantaIdeasModal({
  isOpen,
  onClose,
  secretSanta,
  ideas,
  isLoading = false,
}: MySantaIdeasModalProps) {
  const { t } = useTranslation()

  const getUserName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
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
              className="relative w-full max-w-2xl rounded-2xl bg-background shadow-2xl border border-border-soft overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-border-soft flex items-center justify-between bg-secondary/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Gift className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-text-main">
                      {t('groupDetail.secretSantaGiftIdeas')}
                    </h2>
                    {secretSanta && (
                      <p className="text-sm text-text-secondary mt-1">
                        {t('groupDetail.secretSantaGiftIdeasDescription', {
                          name: getUserName(secretSanta),
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-background rounded-lg transition-colors"
                  aria-label={t('groupDetail.close')}
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : ideas && Array.isArray(ideas) && ideas.length > 0 ? (
                  <div className="space-y-3">
                    {ideas.map((idea: any) => (
                      <div
                        key={idea.id}
                        className="p-4 bg-background rounded-lg border border-border-soft hover:border-primary/30 transition-colors"
                      >
                        <h3 className="font-semibold text-text-main text-lg mb-2">
                          {idea.title}
                        </h3>
                        {idea.description && (
                          <p className="text-sm text-text-secondary whitespace-pre-wrap">
                            {idea.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="p-4 bg-background rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Gift className="w-8 h-8 text-text-secondary" />
                    </div>
                    <p className="text-text-secondary">
                      {t('groupDetail.noSecretSantaGiftIdeas')}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-border-soft bg-background">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  {t('groupDetail.close')}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

