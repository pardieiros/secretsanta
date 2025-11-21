import { useTranslation } from 'react-i18next'
import Card from '../../Card'
import Button from '../../Button'

interface DrawButtonCardProps {
  canDraw: boolean
  membersWithoutGiftIdeasCount: number
  isPending: boolean
  hasBasicConditions: boolean
  onDrawClick: () => void
}

export default function DrawButtonCard({
  canDraw,
  membersWithoutGiftIdeasCount,
  isPending,
  hasBasicConditions,
  onDrawClick,
}: DrawButtonCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.readyToDrawTitle')}</h3>
          <p className="text-sm text-text-secondary">
            {canDraw ? t('groupDetail.readyToDrawDescription') : t('groupDetail.waitingDescription')}
          </p>
          {!canDraw && membersWithoutGiftIdeasCount > 0 && (
            <p className="text-sm text-warning mt-2">
              {t('groupDetail.membersWithoutGiftIdeas', { count: membersWithoutGiftIdeasCount })}
            </p>
          )}
        </div>
        <Button onClick={onDrawClick} disabled={isPending || !hasBasicConditions}>
          {isPending ? t('groupDetail.drawing') : t('groupDetail.runDraw')}
        </Button>
      </div>
    </Card>
  )
}



