import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../../Card'
import Button from '../../Button'

interface GiftIdeasLinkCardProps {
  groupId: number
}

export default function GiftIdeasLinkCard({ groupId }: GiftIdeasLinkCardProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.giftIdeas')}</h3>
          <p className="text-sm text-text-secondary">{t('groupDetail.giftIdeasDescription')}</p>
        </div>
        <Link to={`/groups/${groupId}/gift-ideas`}>
          <Button variant="secondary">{t('groupDetail.manageGiftIdeasButton')}</Button>
        </Link>
      </div>
    </Card>
  )
}

