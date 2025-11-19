import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Gift, X } from 'lucide-react'
import Avatar from '../../Avatar'

interface RevelationModalProps {
  isOpen: boolean
  onClose: () => void
  secretSanta: {
    id: number
    first_name: string
    last_name: string
    email: string
    profile_picture?: string | null
  } | null
}

export default function RevelationModal({ isOpen, onClose, secretSanta }: RevelationModalProps) {
  const { t } = useTranslation()
  const [isGrowing, setIsGrowing] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [scale, setScale] = useState(1)

  const handleGiftClick = () => {
    if (isRevealed) return

    const newScale = Math.min(scale + 0.15, 3.5)

    setScale(newScale)
    setIsGrowing(true)

    if (newScale >= 3.5) {
      setTimeout(() => {
        setIsRevealed(true)
        setIsGrowing(false)
      }, 300)
    } else {
      setTimeout(() => {
        setIsGrowing(false)
      }, 200)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setIsRevealed(false)
      setScale(1)
      setIsGrowing(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const getUserName = () => {
    if (secretSanta?.first_name && secretSanta?.last_name) {
      return `${secretSanta.first_name} ${secretSanta.last_name}`
    }
    return secretSanta?.email || ''
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-2xl max-w-2xl w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-main transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {!isRevealed ? (
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-text-main mb-4">
              {t('groupDetail.openYourGift')}
            </h2>
            <p className="text-text-secondary mb-8">
              {t('groupDetail.clickGiftToReveal')}
            </p>

            <div className="flex justify-center items-center min-h-[300px]">
              <button
                onClick={handleGiftClick}
                className={`transition-all duration-200 ease-out cursor-pointer ${
                  isGrowing ? 'animate-pulse' : 'hover:scale-110'
                }`}
                style={{
                  transform: `scale(${scale})`,
                  transition: isGrowing ? 'transform 0.2s ease-out' : 'transform 0.3s ease-out',
                }}
              >
                <Gift className="w-32 h-32 md:w-40 md:h-40 text-primary animate-bounce" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center animate-fade-in">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-secondary rounded-full blur-2xl opacity-50 animate-pulse"></div>
                <Avatar
                  src={secretSanta?.profile_picture}
                  name={getUserName()}
                  size="xl"
                  className="relative z-10"
                />
              </div>
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-2 animate-slide-up">
              🎉 {t('groupDetail.yourSecretSantaIs')} 🎉
            </h2>

            <h3 className="text-2xl md:text-3xl font-bold text-primary mb-4 animate-slide-up">
              {getUserName()}
            </h3>

            {secretSanta?.email && (
              <p className="text-text-secondary mb-8 animate-slide-up">{secretSanta.email}</p>
            )}

            <button
              onClick={onClose}
              className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-8 rounded-lg transition-colors animate-slide-up"
            >
              {t('groupDetail.close')}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in-reveal {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up-reveal {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in-reveal 0.5s ease-out;
        }

        .animate-slide-up {
          animation: slide-up-reveal 0.6s ease-out;
        }
      `}</style>
    </div>
  )
}

