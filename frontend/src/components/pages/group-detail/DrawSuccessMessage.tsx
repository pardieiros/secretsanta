import { useTranslation } from 'react-i18next'
import { Gift } from 'lucide-react'
import Card from '../../Card'

export default function DrawSuccessMessage() {
  const { t } = useTranslation()

  return (
    <Card className="bg-success/10 border-success mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-success/20 rounded-lg">
          <Gift className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-success mb-1">{t('groupDetail.drawCompleted')}</h3>
          <p className="text-sm text-text-secondary">{t('groupDetail.drawCompletedMessage')}</p>
        </div>
      </div>
    </Card>
  )
}




