import { useTranslation } from 'react-i18next'
import Card from '../../Card'

interface GiftIdea {
  id: number
  title: string
  description?: string
}

interface SecretSantaGiftIdeasCardProps {
  isRevealed: boolean
  giverName?: string
  giftIdeas: GiftIdea[]
  isLoading: boolean
}

export default function SecretSantaGiftIdeasCard({
  isRevealed,
  giverName,
  giftIdeas,
  isLoading,
}: SecretSantaGiftIdeasCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <h3 className="font-semibold text-text-main mb-4">
        {isRevealed && giverName
          ? t('groupDetail.secretSantaGiftIdeas')
          : t('groupDetail.mySecretSantaGiftIdeas')}
      </h3>

      {isRevealed && giverName ? (
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : giftIdeas && Array.isArray(giftIdeas) && giftIdeas.length > 0 ? (
            <div className="space-y-2">
              {giftIdeas.map((idea) => (
                <div key={idea.id} className="p-3 bg-background rounded-lg border border-border-soft">
                  <p className="font-medium text-text-main">{idea.title}</p>
                  {idea.description && (
                    <p className="text-sm text-text-secondary mt-1">{idea.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">{t('groupDetail.noSecretSantaGiftIdeas')}</p>
          )}
        </div>
      ) : (
        <div>
          <p className="text-sm text-text-secondary mb-3">
            {t('groupDetail.mySecretSantaGiftIdeasDescription')}
          </p>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : giftIdeas && Array.isArray(giftIdeas) && giftIdeas.length > 0 ? (
            <div className="space-y-2">
              {giftIdeas.map((idea) => (
                <div key={idea.id} className="p-3 bg-background rounded-lg border border-border-soft">
                  <p className="font-medium text-text-main">{idea.title}</p>
                  {idea.description && (
                    <p className="text-sm text-text-secondary mt-1">{idea.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">{t('groupDetail.noSecretSantaGiftIdeas')}</p>
          )}
        </div>
      )}
    </Card>
  )
}




