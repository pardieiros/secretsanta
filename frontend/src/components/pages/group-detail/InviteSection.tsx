import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import Card from '../../Card'
import Button from '../../Button'
import { groupAPI } from '../../../lib/api'

interface InviteSectionProps {
  groupId: number
  inviteCode: string
  onAddFriendsClick: () => void
}

export default function InviteSection({
  groupId,
  inviteCode,
  onAddFriendsClick,
}: InviteSectionProps) {
  const { t } = useTranslation()
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteEmail, setShowInviteEmail] = useState(false)

  const inviteEmailMutation = useMutation({
    mutationFn: (email: string) => groupAPI.sendInviteEmail(groupId, email),
    onSuccess: () => {
      alert(t('groupDetail.invitationEmailSent'))
      setInviteEmail('')
      setShowInviteEmail(false)
    },
  })

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join/${inviteCode}`
    navigator.clipboard.writeText(inviteLink)
    alert(t('groupDetail.inviteLinkCopied'))
  }

  return (
    <Card>
      <h3 className="font-semibold text-text-main mb-4">{t('groupDetail.inviteMembers')}</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            {t('groupDetail.inviteLink')}
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/join/${inviteCode}`}
              className="input-field flex-1"
            />
            <Button onClick={copyInviteLink}>{t('groupDetail.copy')}</Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {!showInviteEmail ? (
            <>
              <Button variant="secondary" onClick={() => setShowInviteEmail(true)}>
                {t('groupDetail.sendEmailInvitation')}
              </Button>
              <Button
                variant="secondary"
                onClick={onAddFriendsClick}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {t('groupDetail.addFriends')}
              </Button>
            </>
          ) : (
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder={t('groupDetail.emailPlaceholder')}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="input-field flex-1"
              />
              <Button
                onClick={() => inviteEmailMutation.mutate(inviteEmail)}
                disabled={!inviteEmail || inviteEmailMutation.isPending}
              >
                {t('groupDetail.send')}
              </Button>
              <Button variant="secondary" onClick={() => setShowInviteEmail(false)}>
                {t('createGroup.cancel')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}




