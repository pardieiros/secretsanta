import { useTranslation } from 'react-i18next'
import { Eye, Calendar, Gift } from 'lucide-react'
import Card from '../../Card'
import Button from '../../Button'

interface RevealControlsCardProps {
  onRevealNow: () => void
  onScheduleReveal: () => void
  onOpenRevelation: () => void
  isPending: boolean
  isRevealed: boolean
}

export default function RevealControlsCard({
  onRevealNow,
  onScheduleReveal,
  onOpenRevelation,
  isPending,
  isRevealed,
}: RevealControlsCardProps) {
  const { t } = useTranslation()

  if (isRevealed) {
    return (
      <Card className="bg-gradient-to-r from-secondary/10 to-primary/10 border-secondary/20">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-secondary/20 rounded-full">
              <Gift className="w-12 h-12 text-secondary" />
            </div>
          </div>
          <h3 className="font-semibold text-text-main mb-2 text-xl">
            {t('groupDetail.secretSantaRevealed')}!
          </h3>
          <p className="text-sm text-text-secondary mb-6">
            {t('groupDetail.clickGiftToReveal')}
          </p>
          <Button onClick={onOpenRevelation} className="w-full sm:w-auto">
            <Gift className="w-5 h-5 mr-2" />
            {t('groupDetail.openYourGift')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="font-semibold text-text-main mb-4">{t('groupDetail.revealSecretSantas')}</h3>
      <p className="text-sm text-text-secondary mb-4">{t('groupDetail.revealDescription')}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onRevealNow}
          disabled={isPending}
          className="flex-1"
        >
          <Eye className="w-4 h-4 mr-2" />
          {t('groupDetail.revealNow')}
        </Button>
        <Button variant="secondary" onClick={onScheduleReveal} className="flex-1">
          <Calendar className="w-4 h-4 mr-2" />
          {t('groupDetail.scheduleReveal')}
        </Button>
      </div>
    </Card>
  )
}

