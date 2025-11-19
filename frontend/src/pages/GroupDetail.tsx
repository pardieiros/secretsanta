import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { groupAPI, giftIdeaAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import AddFriendsToGroupModal from '../components/AddFriendsToGroupModal'
import MembersWithoutGiftIdeasModal from '../components/MembersWithoutGiftIdeasModal'
import { useState } from 'react'
import { UserPlus, Gift, Eye, Calendar } from 'lucide-react'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'
import Input from '../components/Input'

export default function GroupDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const groupId = parseInt(id || '0')
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteEmail, setShowInviteEmail] = useState(false)
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false)
  const [showMembersWithoutGiftIdeasModal, setShowMembersWithoutGiftIdeasModal] = useState(false)
  const [showRevealModal, setShowRevealModal] = useState(false)
  const [revealDatetime, setRevealDatetime] = useState('')
  const [drawSuccess, setDrawSuccess] = useState(false)
  const { isOpen, errorData, showError, hideError } = useErrorModal()

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupAPI.get(groupId),
  })

  const { data: members } = useQuery({
    queryKey: ['group', groupId, 'members'],
    queryFn: () => groupAPI.getMembers(groupId),
    enabled: !!group,
  })

  const { data: myAssignment } = useQuery({
    queryKey: ['group', groupId, 'my_assignment'],
    queryFn: () => groupAPI.getMyAssignment(groupId),
    enabled: !!group && group.is_drawn,
  })

  const { data: whoDrewMe } = useQuery({
    queryKey: ['group', groupId, 'who_drew_me'],
    queryFn: () => groupAPI.getWhoDrewMe(groupId),
    enabled: !!group && group.is_drawn,
  })

  const { data: receiverIdeas } = useQuery({
    queryKey: ['group', groupId, 'receiver_ideas'],
    queryFn: () => giftIdeaAPI.getReceiverIdeas(groupId),
    enabled: !!group && group.is_drawn && !!myAssignment?.receiver,
  })

  // Get gift ideas of my Secret Santa (who drew me)
  // Note: isRevealed is calculated later in the component, but we enable the query
  // The backend will handle the reveal check and return empty array if not revealed
  const { data: secretSantaGiftIdeas, isLoading: isLoadingSecretSantaIdeas } = useQuery({
    queryKey: ['group', groupId, 'secret_santa_gift_ideas'],
    queryFn: () => groupAPI.getSecretSantaGiftIdeas(groupId),
    enabled: !!group && group.is_drawn,
  })

  const { data: membersWithoutGiftIdeas = [] } = useQuery({
    queryKey: ['group', groupId, 'members_without_gift_ideas'],
    queryFn: () => groupAPI.getMembersWithoutGiftIdeas(groupId),
    enabled: !!group && group.is_owner && !group.is_drawn,
  })

  const handleDrawClick = () => {
    // Check if there are members without gift ideas
    if (membersWithoutGiftIdeas && membersWithoutGiftIdeas.length > 0) {
      setShowMembersWithoutGiftIdeasModal(true)
      return
    }
    // If all have gift ideas and other conditions are met, proceed with draw
    // The backend will validate all conditions anyway
    drawMutation.mutate()
  }
  
  // Check if we can show the button (basic conditions met)
  // Only show if draw hasn't been completed yet
  const canShowDrawButton = group && !group.is_drawn && group.is_owner
  const hasBasicConditions = group && 
    new Date() >= new Date(group.draw_datetime) && 
    (members?.length || 0) >= group.min_participants

  const drawMutation = useMutation({
    mutationFn: () => groupAPI.draw(groupId),
    onSuccess: () => {
      setDrawSuccess(true)
      // Backend now marks is_drawn = True immediately, so we can update right away
      // But assignments are still being created in background, so we poll for them
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'members_without_gift_ideas'] })
      
      // Poll for assignments (they're created in background by Celery)
      let attempts = 0
      const maxAttempts = 10 // 10 seconds max
      const checkInterval = setInterval(() => {
        attempts++
        
        // Check if assignments are ready
        queryClient.refetchQueries({ queryKey: ['group', groupId, 'my_assignment'] }).then(() => {
          const assignment = queryClient.getQueryData(['group', groupId, 'my_assignment']) as any
          
          if (assignment?.receiver || attempts >= maxAttempts) {
            // Assignments are ready or timeout reached
            clearInterval(checkInterval)
            setDrawSuccess(false)
            // Final refresh of all related queries
            queryClient.invalidateQueries({ queryKey: ['group', groupId] })
            queryClient.invalidateQueries({ queryKey: ['group', groupId, 'my_assignment'] })
            queryClient.invalidateQueries({ queryKey: ['group', groupId, 'receiver_ideas'] })
            queryClient.invalidateQueries({ queryKey: ['group', groupId, 'who_drew_me'] })
          }
        })
      }, 1000)
    },
    onError: (error: any) => {
      setDrawSuccess(false)
      handleApiError(error, showError)
    },
  })
  
  const revealMutation = useMutation({
    mutationFn: (revealDatetime?: string) => groupAPI.reveal(groupId, revealDatetime),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'who_drew_me'] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'secret_santa_gift_ideas'] })
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const inviteEmailMutation = useMutation({
    mutationFn: (email: string) => groupAPI.sendInviteEmail(groupId, email),
    onSuccess: () => {
      alert(t('groupDetail.invitationEmailSent'))
      setInviteEmail('')
      setShowInviteEmail(false)
    },
  })

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join/${group?.invite_code}`
    navigator.clipboard.writeText(inviteLink)
    alert(t('groupDetail.inviteLinkCopied'))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!group) {
    return <Card><p className="text-error">{t('groupDetail.notFound')}</p></Card>
  }

  const exchangeDate = new Date(group.exchange_date)
  
  // Calculate if Secret Santa is revealed
  const now = new Date()
  const revealDate = group.reveal_datetime ? new Date(group.reveal_datetime) : exchangeDate
  const isRevealed = group.is_revealed || (group.reveal_datetime && now >= revealDate) || now >= exchangeDate

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-main break-words">{group.name}</h1>
            <span className={`badge text-xs sm:text-sm ${group.visibility === 'public' ? 'badge-secondary' : 'bg-gray-500 text-white'}`}>
              {group.visibility === 'public' ? t('groupDetail.public') : t('groupDetail.private')}
            </span>
          </div>
          {group.description && (
            <p className="text-sm sm:text-base text-text-secondary break-words">{group.description}</p>
          )}
        </div>
        {group.is_owner && (
          <Link to={`/groups/${groupId}/edit`} className="flex-shrink-0">
            <Button variant="secondary" className="w-full sm:w-auto">{t('groupDetail.editGroup')}</Button>
          </Link>
        )}
      </div>

      {/* Group Info */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.drawInformation')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('groupDetail.drawDate')}</span>
                <span className="font-medium">{format(new Date(group.draw_datetime), 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('groupDetail.exchangeDate')}</span>
                <span className="font-medium">{format(new Date(group.exchange_date), 'PP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t('groupDetail.participants')}</span>
                <span className="font-medium">
                  {group.member_count} / {group.min_participants}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.status')}</h3>
            <div className="space-y-2">
              {group.is_drawn ? (
                <span className="badge-success">{t('groupDetail.drawCompleted')}</span>
              ) : group.can_draw ? (
                <span className="badge-warning">{t('groupDetail.readyToDraw')}</span>
              ) : (
                <span className="badge bg-gray-400 text-white">{t('groupDetail.pending')}</span>
              )}
              {group.auto_draw_enabled && (
                <span className="badge-secondary ml-2">{t('groupDetail.autoDrawEnabled')}</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Invite Section */}
      {group.is_owner && !group.is_drawn && (
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
                  value={`${window.location.origin}/join/${group.invite_code}`}
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
                    onClick={() => setShowAddFriendsModal(true)}
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
      )}

      {/* Add Friends Modal */}
      <AddFriendsToGroupModal
        isOpen={showAddFriendsModal}
        onClose={() => setShowAddFriendsModal(false)}
        groupId={groupId}
        currentMemberIds={members?.map((m: any) => m.user.id) || []}
      />

      {/* Draw Button */}
      {canShowDrawButton && (
        <Card>
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.readyToDrawTitle')}</h3>
              <p className="text-sm text-text-secondary">
                {group.can_draw
                  ? t('groupDetail.readyToDrawDescription')
                  : t('groupDetail.waitingDescription')}
              </p>
              {!group.can_draw && membersWithoutGiftIdeas && membersWithoutGiftIdeas.length > 0 && (
                <p className="text-sm text-warning mt-2">
                  {t('groupDetail.membersWithoutGiftIdeas', { count: membersWithoutGiftIdeas.length })}
                </p>
              )}
            </div>
            <Button
              onClick={handleDrawClick}
              disabled={drawMutation.isPending || !hasBasicConditions}
            >
              {drawMutation.isPending ? t('groupDetail.drawing') : t('groupDetail.runDraw')}
            </Button>
          </div>
        </Card>
      )}

      {/* Members */}
      <Card>
        <h3 className="font-semibold text-text-main mb-4">{t('groupDetail.members')} ({members?.length || 0})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members?.map((member: any) => (
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
              {member.user.id === group.owner.id && (
                <span className="badge-secondary ml-auto">{t('groupDetail.owner')}</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Draw Success Message */}
      {drawSuccess && (
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
      )}

      {/* My Assignment */}
      {group.is_drawn && myAssignment && (
        <Card>
          <h3 className="font-semibold text-text-main mb-4">{t('groupDetail.myAssignment')}</h3>
          {myAssignment.receiver ? (
            <div>
              <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-text-secondary mb-2">{t('groupDetail.givingGiftTo')}</p>
                <p className="text-xl font-bold text-text-main">
                  {myAssignment.receiver.first_name} {myAssignment.receiver.last_name}
                  <span className="text-text-secondary text-base font-normal ml-2">
                    ({myAssignment.receiver.email})
                  </span>
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Link to={`/groups/${groupId}/gift-ideas`} className="flex-1">
                  <Button variant="secondary" className="w-full">
                    {t('groupDetail.manageMyGiftIdeas')}
                  </Button>
                </Link>
                {receiverIdeas && receiverIdeas.length > 0 ? (
                  <div className="flex-1 sm:flex-initial">
                    <p className="text-sm text-text-secondary mb-2">{t('groupDetail.theirGiftIdeas')}</p>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'receiver_ideas'] })
                    }}
                    className="flex-1 sm:flex-initial"
                  >
                    <Gift className="w-4 h-4 mr-2" />
                    {t('groupDetail.viewSecretSantaGiftIdeasEmpty')}
                  </Button>
                )}
              </div>

              {receiverIdeas && receiverIdeas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border-soft">
                  <h4 className="font-semibold text-text-main mb-3">{t('groupDetail.theirGiftIdeas')}</h4>
                  <div className="space-y-2">
                    {receiverIdeas.map((idea: any) => (
                      <div key={idea.id} className="p-3 bg-background rounded-lg">
                        <p className="font-medium text-text-main">{idea.title}</p>
                        {idea.description && (
                          <p className="text-sm text-text-secondary mt-1">{idea.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-secondary">{t('groupDetail.noAssignment')}</p>
          )}
        </Card>
      )}

      {/* Reveal Controls (Admin Only) */}
      {group.is_drawn && group.is_owner && !group.is_revealed && (
        <Card>
          <h3 className="font-semibold text-text-main mb-4">{t('groupDetail.revealSecretSantas')}</h3>
          <p className="text-sm text-text-secondary mb-4">{t('groupDetail.revealDescription')}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => revealMutation.mutate(undefined)}
              disabled={revealMutation.isPending}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              {t('groupDetail.revealNow')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowRevealModal(true)}
              className="flex-1"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('groupDetail.scheduleReveal')}
            </Button>
          </div>
        </Card>
      )}

      {/* Who Drew Me */}
      {group.is_drawn && (
        <Card>
          <h3 className="font-semibold text-text-main mb-4">{t('groupDetail.whoDrewMe')}</h3>
          {(() => {
            const now = new Date()
            const revealDate = group.reveal_datetime ? new Date(group.reveal_datetime) : exchangeDate
            const isRevealed = group.is_revealed || (group.reveal_datetime && now >= revealDate) || now >= exchangeDate
            
            if (isRevealed && whoDrewMe?.giver) {
              return (
                <div>
                  <span className="badge-secondary mb-4 inline-block">{t('groupDetail.secretSantaRevealed')}</span>
                  <p className="text-text-secondary mb-2">{t('groupDetail.yourSecretSanta')}</p>
                  <p className="text-xl font-bold text-text-main">
                    {whoDrewMe.giver.first_name} {whoDrewMe.giver.last_name}
                    <span className="text-text-secondary text-base font-normal ml-2">
                      ({whoDrewMe.giver.email})
                    </span>
                  </p>
                </div>
              )
            } else {
              return (
                <div>
                  <p className="text-warning font-medium mb-2">
                    {t('groupDetail.revelationDate')} {format(revealDate, 'PPp')}
                  </p>
                  <p className="text-text-secondary text-sm">
                    {t('groupDetail.checkBackAfter')}
                  </p>
                </div>
              )
            }
          })()}
        </Card>
      )}

      {/* Gift Ideas Link - Only show if draw hasn't been completed */}
      {!group.is_drawn && (
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-text-main mb-2">{t('groupDetail.giftIdeas')}</h3>
              <p className="text-sm text-text-secondary">
                {t('groupDetail.giftIdeasDescription')}
              </p>
            </div>
            <Link to={`/groups/${groupId}/gift-ideas`}>
              <Button variant="secondary">{t('groupDetail.manageGiftIdeasButton')}</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Secret Santa Gift Ideas - Show when revealed */}
      {group.is_drawn && isRevealed && whoDrewMe?.giver && (
        <Card>
          <h3 className="font-semibold text-text-main mb-4">
            {t('groupDetail.secretSantaGiftIdeas')}
          </h3>
          {isLoadingSecretSantaIdeas ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : secretSantaGiftIdeas && Array.isArray(secretSantaGiftIdeas) && secretSantaGiftIdeas.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary mb-3">
                {t('groupDetail.secretSantaGiftIdeasDescription', { name: `${whoDrewMe.giver.first_name} ${whoDrewMe.giver.last_name}` })}
              </p>
              <div className="space-y-2">
                {secretSantaGiftIdeas.map((idea: any) => (
                  <div key={idea.id} className="p-3 bg-background rounded-lg border border-border-soft">
                    <p className="font-medium text-text-main">{idea.title}</p>
                    {idea.description && (
                      <p className="text-sm text-text-secondary mt-1">{idea.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-text-secondary">{t('groupDetail.noSecretSantaGiftIdeas')}</p>
          )}
        </Card>
      )}

      <MembersWithoutGiftIdeasModal
        isOpen={showMembersWithoutGiftIdeasModal}
        onClose={() => setShowMembersWithoutGiftIdeasModal(false)}
        members={membersWithoutGiftIdeas || []}
      />

      {/* Reveal Modal */}
      {showRevealModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRevealModal(false)}>
          <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-main mb-4">{t('groupDetail.scheduleReveal')}</h3>
            <Input
              label={t('groupDetail.revealDatetime')}
              type="datetime-local"
              value={revealDatetime}
              onChange={(e) => setRevealDatetime(e.target.value)}
              required
            />
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => {
                  if (revealDatetime) {
                    revealMutation.mutate(revealDatetime)
                    setShowRevealModal(false)
                    setRevealDatetime('')
                  }
                }}
                disabled={!revealDatetime || revealMutation.isPending}
                className="flex-1"
              >
                {t('groupDetail.schedule')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRevealModal(false)
                  setRevealDatetime('')
                }}
                className="flex-1"
              >
                {t('groupDetail.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ErrorModal
        isOpen={isOpen}
        title={errorData.title}
        message={errorData.message}
        errors={errorData.errors}
        onClose={hideError}
      />
    </div>
  )
}

