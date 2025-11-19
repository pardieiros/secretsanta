import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import Card from '../../Card'

interface GroupInfoCardProps {
  drawDatetime: string
  exchangeDate: string
  memberCount: number
  minParticipants: number
  isDrawn: boolean
  canDraw: boolean
  autoDrawEnabled?: boolean
}

export default function GroupInfoCard({
  drawDatetime,
  exchangeDate,
  memberCount,
  minParticipants,
  isDrawn,
  canDraw,
  autoDrawEnabled,
}: GroupInfoCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.drawInformation')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('groupDetail.drawDate')}</span>
              <span className="font-medium">{format(new Date(drawDatetime), 'PPpp')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('groupDetail.exchangeDate')}</span>
              <span className="font-medium">{format(new Date(exchangeDate), 'PP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">{t('groupDetail.participants')}</span>
              <span className="font-medium">
                {memberCount} / {minParticipants}
              </span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.status')}</h3>
          <div className="space-y-2">
            {isDrawn ? (
              <span className="badge-success">{t('groupDetail.drawCompleted')}</span>
            ) : canDraw ? (
              <span className="badge-warning">{t('groupDetail.readyToDraw')}</span>
            ) : (
              <span className="badge bg-gray-400 text-white">{t('groupDetail.pending')}</span>
            )}
            {autoDrawEnabled && (
              <span className="badge-secondary ml-2">{t('groupDetail.autoDrawEnabled')}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

