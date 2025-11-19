import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Card from '../../Card'
import Button from '../../Button'
import emptyState from '../../../assets/img/image.png'

export default function GroupsEmptyState() {
  const { t } = useTranslation()

  return (
    <Card className="text-center py-12">
      <img src={emptyState} alt="No groups" className="h-64 mx-auto mb-6 opacity-50" />
      <h2 className="text-2xl font-bold text-text-main mb-2">{t('groups.noGroups')}</h2>
      <p className="text-text-secondary mb-6">{t('groups.noGroupsSubtitle')}</p>
      <Link to="/groups/new">
        <Button>{t('groups.createGroup')}</Button>
      </Link>
    </Card>
  )
}

