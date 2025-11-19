import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { groupAPI } from '../lib/api'
import AddFriendsToGroupModal from '../components/AddFriendsToGroupModal'
import MembersWithoutGiftIdeasModal from '../components/MembersWithoutGiftIdeasModal'
import { useState } from 'react'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'
import GroupDetailHeader from '../components/pages/group-detail/GroupDetailHeader'
import GroupDetailLoading from '../components/pages/group-detail/GroupDetailLoading'
import GroupDetailNotFound from '../components/pages/group-detail/GroupDetailNotFound'
import GroupInfoCard from '../components/pages/group-detail/GroupInfoCard'
import InviteSection from '../components/pages/group-detail/InviteSection'
import DrawButtonCard from '../components/pages/group-detail/DrawButtonCard'
import MembersList from '../components/pages/group-detail/MembersList'
import DrawSuccessMessage from '../components/pages/group-detail/DrawSuccessMessage'
import SecretSantaGiftIdeasCard from '../components/pages/group-detail/SecretSantaGiftIdeasCard'
import RevealControlsCard from '../components/pages/group-detail/RevealControlsCard'
import GiftIdeasLinkCard from '../components/pages/group-detail/GiftIdeasLinkCard'
import RevealModal from '../components/pages/group-detail/RevealModal'
import RevelationModal from '../components/pages/group-detail/RevelationModal'
import { useTranslation } from 'react-i18next'
import { Gift } from 'lucide-react'
import Button from '../components/Button'
import Card from '../components/Card'

export default function GroupDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const groupId = parseInt(id || '0')
  const [showAddFriendsModal, setShowAddFriendsModal] = useState(false)
  const [showMembersWithoutGiftIdeasModal, setShowMembersWithoutGiftIdeasModal] = useState(false)
  const [showRevealModal, setShowRevealModal] = useState(false)
  const [showRevelationModal, setShowRevelationModal] = useState(false)
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

  const { data: whoDrewMe } = useQuery({
    queryKey: ['group', groupId, 'who_drew_me'],
    queryFn: () => groupAPI.getWhoDrewMe(groupId),
    enabled: !!group && group.is_drawn,
  })

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
    if (membersWithoutGiftIdeas && membersWithoutGiftIdeas.length > 0) {
      setShowMembersWithoutGiftIdeasModal(true)
      return
    }
    drawMutation.mutate()
  }

  const canShowDrawButton = group && !group.is_drawn && group.is_owner
  const hasBasicConditions =
    group &&
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

  const handleRevealSchedule = () => {
    if (revealDatetime) {
      revealMutation.mutate(revealDatetime)
      setShowRevealModal(false)
      setRevealDatetime('')
    }
  }

  if (isLoading) {
    return <GroupDetailLoading />
  }

  if (!group) {
    return <GroupDetailNotFound />
  }

  const exchangeDate = new Date(group.exchange_date)
  const now = new Date()
  const revealDate = group.reveal_datetime ? new Date(group.reveal_datetime) : exchangeDate
  const isRevealed =
    group.is_revealed || (group.reveal_datetime && now >= revealDate) || now >= exchangeDate

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
      <GroupDetailHeader
        groupId={groupId}
        groupName={group.name}
        description={group.description}
        visibility={group.visibility}
        isOwner={group.is_owner}
      />

      <GroupInfoCard
        drawDatetime={group.draw_datetime}
        exchangeDate={group.exchange_date}
        memberCount={group.member_count}
        minParticipants={group.min_participants}
        isDrawn={group.is_drawn}
        canDraw={group.can_draw}
        autoDrawEnabled={group.auto_draw_enabled}
      />

      {group.is_owner && !group.is_drawn && (
        <InviteSection
          groupId={groupId}
          inviteCode={group.invite_code}
          onAddFriendsClick={() => setShowAddFriendsModal(true)}
        />
      )}

      <AddFriendsToGroupModal
        isOpen={showAddFriendsModal}
        onClose={() => setShowAddFriendsModal(false)}
        groupId={groupId}
        currentMemberIds={members?.map((m: any) => m.user.id) || []}
      />

      {canShowDrawButton && (
        <DrawButtonCard
          canDraw={group.can_draw}
          membersWithoutGiftIdeasCount={membersWithoutGiftIdeas.length}
          isPending={drawMutation.isPending}
          hasBasicConditions={!!hasBasicConditions}
          onDrawClick={handleDrawClick}
        />
      )}

      {members && <MembersList members={members} ownerId={group.owner.id} />}

      {drawSuccess && <DrawSuccessMessage />}

      {group.is_drawn && (
        <SecretSantaGiftIdeasCard
          isRevealed={isRevealed}
          giverName={whoDrewMe?.giver?.first_name}
          giftIdeas={secretSantaGiftIdeas || []}
          isLoading={isLoadingSecretSantaIdeas}
        />
      )}

      {group.is_drawn && group.is_owner && (
        <RevealControlsCard
          onRevealNow={() => revealMutation.mutate(undefined)}
          onScheduleReveal={() => setShowRevealModal(true)}
          onOpenRevelation={() => setShowRevelationModal(true)}
          isPending={revealMutation.isPending}
          isRevealed={group.is_revealed}
        />
      )}

      {group.is_drawn && !group.is_owner && group.is_revealed && (
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
            <Button onClick={() => setShowRevelationModal(true)} className="w-full sm:w-auto">
              <Gift className="w-5 h-5 mr-2" />
              {t('groupDetail.openYourGift')}
            </Button>
          </div>
        </Card>
      )}

      {!group.is_drawn && <GiftIdeasLinkCard groupId={groupId} />}

      <MembersWithoutGiftIdeasModal
        isOpen={showMembersWithoutGiftIdeasModal}
        onClose={() => setShowMembersWithoutGiftIdeasModal(false)}
        members={membersWithoutGiftIdeas || []}
      />

      <RevealModal
        isOpen={showRevealModal}
        revealDatetime={revealDatetime}
        isPending={revealMutation.isPending}
        onClose={() => {
          setShowRevealModal(false)
          setRevealDatetime('')
        }}
        onDatetimeChange={setRevealDatetime}
        onSchedule={handleRevealSchedule}
      />

      {group.is_revealed && whoDrewMe?.giver && (
        <RevelationModal
          isOpen={showRevelationModal}
          onClose={() => setShowRevelationModal(false)}
          secretSanta={whoDrewMe.giver}
        />
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

