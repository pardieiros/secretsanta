import { useTranslation } from 'react-i18next'
import Card from '../../Card'

interface Member {
  id: number
  user: {
    id: number
    first_name: string
    last_name: string
    email: string
  }
}

interface MembersListProps {
  members: Member[]
  ownerId: number
}

export default function MembersList({ members, ownerId }: MembersListProps) {
  const { t } = useTranslation()

  return (
    <Card>
      <h3 className="font-semibold text-text-main mb-4">
        {t('groupDetail.members')} ({members.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((member) => (
          <div key={member.id} className="flex items-center space-x-3 p-3 bg-background rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-text-on-dark font-bold">
              {member.user.first_name?.[0] || member.user.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-text-main">
                {member.user.first_name} {member.user.last_name}
              </p>
              <p className="text-sm text-text-secondary">{member.user.email}</p>
            </div>
            {member.user.id === ownerId && (
              <span className="badge-secondary ml-auto">{t('groupDetail.owner')}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}

