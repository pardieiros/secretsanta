import { useTranslation } from 'react-i18next'
import Card from '../../Card'

export default function GroupDetailNotFound() {
  const { t } = useTranslation()

  return (
    <Card>
      <p className="text-error">{t('groupDetail.notFound')}</p>
    </Card>
  )
}





