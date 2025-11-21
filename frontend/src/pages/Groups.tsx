import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, UserPlus, Mail, Search, CheckCircle, X, Calendar, CalendarDays, XCircle, Gift } from 'lucide-react'
import { groupAPI, notificationAPI } from '../lib/api'
import { format } from 'date-fns'
import GroupsHeader from '../components/pages/groups/GroupsHeader'
import GroupsLoading from '../components/pages/groups/GroupsLoading'
import GroupsEmptyState from '../components/pages/groups/GroupsEmptyState'
import GroupsGrid from '../components/pages/groups/GroupsGrid'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Avatar from '../components/Avatar'

type TabType = 'groups' | 'invites'

export default function Groups() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<TabType>('groups')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvite, setSelectedInvite] = useState<any | null>(null)

  // Get groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.list(),
  })

  // Handle paginated response
  const groups = groupsData?.results || groupsData || []

  // Get pending invites - only fetch when invites tab is active
  const { data: pendingInvitesData, isLoading: isLoadingPending, error: pendingError } = useQuery({
    queryKey: ['groups', 'pending_invites'],
    queryFn: async () => {
      try {
        const data = await groupAPI.getPendingInvites()
        return data
      } catch (error) {
        console.error('Error fetching pending invites:', error)
        throw error
      }
    },
    enabled: activeTab === 'invites',
  })

  // Handle paginated response or direct array
  const pendingInvites = Array.isArray(pendingInvitesData) 
    ? pendingInvitesData 
    : pendingInvitesData?.results || []

  // Search groups - only fetch when invites tab is active and search is active
  const [invitesActiveSubTab, setInvitesActiveSubTab] = useState<'search' | 'pending' | 'sent'>('pending')
  const { data: searchResults = [], isLoading: isLoadingSearch } = useQuery({
    queryKey: ['groups', 'search', searchQuery],
    queryFn: () => groupAPI.searchGroups(searchQuery),
    enabled: activeTab === 'invites' && invitesActiveSubTab === 'search' && searchQuery.length >= 2,
  })

  // Get sent invites
  const { data: sentInvites = [], isLoading: isLoadingSent } = useQuery({
    queryKey: ['groups', 'sent_invites'],
    queryFn: () => groupAPI.getSentInvites(),
    enabled: activeTab === 'invites' && invitesActiveSubTab === 'sent',
  })

  // Join group mutation
  const joinGroupMutation = useMutation({
    mutationFn: (inviteCode: string) => groupAPI.join(inviteCode),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', 'pending_invites'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      navigate(`/groups/${data.id}`)
    },
  })

  // Reject invite mutation
  const rejectInviteMutation = useMutation({
    mutationFn: (notificationId: number) => notificationAPI.rejectGroupInvite(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', 'pending_invites'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setSelectedInvite(null)
    },
  })

  const handleAcceptInvite = (inviteCode: string) => {
    joinGroupMutation.mutate(inviteCode)
  }

  const handleRejectInvite = (notificationId: number) => {
    if (confirm(t('groupInvites.rejectConfirm'))) {
      rejectInviteMutation.mutate(notificationId)
    }
  }

  const getUserName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
  }

  // Get group invite details for modal
  const { data: inviteDetails, isLoading: isLoadingInviteDetails } = useQuery({
    queryKey: ['group', selectedInvite?.group?.id, 'invite_details'],
    queryFn: () => groupAPI.getInviteDetails(selectedInvite.group.id),
    enabled: selectedInvite !== null && selectedInvite?.group?.id !== undefined,
  })

  const invitesSubTabs = [
    { id: 'search' as const, label: t('groupInvites.search'), icon: Search },
    { id: 'pending' as const, label: t('groupInvites.pending'), icon: UserPlus },
    { id: 'sent' as const, label: t('groupInvites.sent'), icon: Mail },
  ]

  if (isLoadingGroups && activeTab === 'groups') {
    return <GroupsLoading />
  }

  return (
    <div className="px-4 sm:px-6">
      <GroupsHeader />

      {/* Main Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-border-soft">
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'groups'
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-main'
          }`}
        >
          <Users className="w-4 h-4" />
          {t('groups.title')}
          {activeTab === 'groups' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('invites')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'invites'
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-main'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          {t('groupInvites.title')}
          {activeTab === 'invites' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
      </div>

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <>
          {groups.length === 0 ? <GroupsEmptyState /> : <GroupsGrid groups={groups} />}
        </>
      )}

      {/* Invites Tab */}
      {activeTab === 'invites' && (
        <div>
          {/* Sub Tabs */}
          <div className="flex space-x-2 mb-6 border-b border-border-soft">
            {invitesSubTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setInvitesActiveSubTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                    invitesActiveSubTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-text-secondary hover:text-text-main'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Search Sub Tab */}
          {invitesActiveSubTab === 'search' && (
            <div className="space-y-6">
              <Card>
                <Input
                  label={t('groupInvites.searchGroups')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('groupInvites.searchPlaceholder')}
                />
              </Card>

              {isLoadingSearch ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : searchQuery.length < 2 ? (
                <Card className="text-center py-12">
                  <Search className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
                  <p className="text-text-secondary">{t('groupInvites.searchHint')}</p>
                </Card>
              ) : searchResults.length === 0 ? (
                <Card className="text-center py-12">
                  <Gift className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
                  <p className="text-text-secondary">{t('groupInvites.noGroupsFound')}</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {searchResults.map((group: any) => (
                    <Card key={group.id} className="hover:shadow-xl transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-text-main">{group.name}</h3>
                      </div>
                      
                      {group.description && (
                        <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">{t('groupInvites.members')}:</span>
                          <span className="font-medium text-text-main">
                            {group.member_count} / {group.min_participants}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-text-secondary">{t('groupInvites.drawDate')}:</span>
                          <span className="font-medium text-text-main">
                            {format(new Date(group.draw_datetime), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => navigate(`/join/${group.invite_code}`)}
                        className="w-full"
                      >
                        {t('groupInvites.joinGroup')}
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pending Sub Tab */}
          {invitesActiveSubTab === 'pending' && (
            <div>
              {pendingError ? (
                <Card className="text-center py-12">
                  <p className="text-error mb-2">{t('groupInvites.errorLoading')}</p>
                  <p className="text-text-secondary text-sm">{String(pendingError)}</p>
                </Card>
              ) : isLoadingPending ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : pendingInvites.length === 0 ? (
                <Card className="text-center py-12">
                  <UserPlus className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
                  <p className="text-text-secondary">{t('groupInvites.noPendingInvites')}</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingInvites.map((invite: any) => (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              {invite.inviter && (
                                <Avatar
                                  src={invite.inviter.profile_picture}
                                  name={getUserName(invite.inviter)}
                                  size="md"
                                />
                              )}
                              <div>
                                <h3 className="font-bold text-text-main text-lg">{invite.group.name}</h3>
                                {invite.inviter && (
                                  <p className="text-sm text-text-secondary">
                                    {t('groupInvites.invitedBy')} {getUserName(invite.inviter)}
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {invite.group.description && (
                              <p className="text-text-secondary text-sm mb-3">{invite.group.description}</p>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div>
                                <span className="text-text-secondary">{t('groupInvites.members')}:</span>
                                <span className="font-medium text-text-main ml-2">
                                  {invite.group.member_count} / {invite.group.min_participants}
                                </span>
                              </div>
                              <div>
                                <span className="text-text-secondary">{t('groupInvites.drawDate')}:</span>
                                <span className="font-medium text-text-main ml-2">
                                  {format(new Date(invite.group.draw_datetime), 'MMM dd, yyyy')}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-text-secondary">
                              {t('groupInvites.invitedOn')} {format(new Date(invite.created_at), 'PPp')}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              onClick={() => handleAcceptInvite(invite.group.invite_code)}
                              disabled={joinGroupMutation.isPending || rejectInviteMutation.isPending}
                              className="flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {t('groupInvites.accept')}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => setSelectedInvite(invite)}
                              className="flex items-center gap-2"
                            >
                              {t('groupInvites.viewDetails')}
                            </Button>
                            <Button
                              variant="secondary"
                              onClick={() => handleRejectInvite(invite.notification_id)}
                              disabled={joinGroupMutation.isPending || rejectInviteMutation.isPending}
                              className="flex items-center gap-2 text-error border-error hover:bg-error/10"
                            >
                              <XCircle className="w-4 h-4" />
                              {t('groupInvites.reject')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sent Sub Tab */}
          {invitesActiveSubTab === 'sent' && (
            <div>
              {isLoadingSent ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : sentInvites.length === 0 ? (
                <Card className="text-center py-12">
                  <Mail className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
                  <p className="text-text-secondary">{t('groupInvites.noSentInvites')}</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sentInvites.map((invite: any) => (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar
                                src={invite.invited_user.profile_picture}
                                name={getUserName(invite.invited_user)}
                                size="md"
                              />
                              <div>
                                <h3 className="font-bold text-text-main text-lg">{invite.group.name}</h3>
                                <p className="text-sm text-text-secondary">
                                  {t('groupInvites.invited')} {getUserName(invite.invited_user)}
                                </p>
                              </div>
                            </div>
                            
                            {invite.group.description && (
                              <p className="text-text-secondary text-sm mb-3">{invite.group.description}</p>
                            )}

                            <div className="flex items-center gap-4 mb-4">
                              <span className={`badge ${invite.is_pending ? 'badge-warning' : 'badge-success'}`}>
                                {invite.is_pending ? t('groupInvites.pending') : t('groupInvites.accepted')}
                              </span>
                              <span className="text-xs text-text-secondary">
                                {t('groupInvites.sentOn')} {format(new Date(invite.created_at), 'PPp')}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/groups/${invite.group.id}`)}
                              className="flex items-center gap-2"
                            >
                              {t('groupInvites.viewGroup')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Group Details Modal */}
      <AnimatePresence>
        {selectedInvite && selectedInvite.group && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setSelectedInvite(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-border-soft">
                {/* Header */}
                <div className="p-6 border-b border-border-soft flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Gift className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-text-main">
                        {selectedInvite.group.name}
                      </h2>
                      <p className="text-sm text-text-secondary">
                        {t('groupInvites.groupDetails')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedInvite(null)}
                    className="text-text-secondary hover:text-text-main transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {isLoadingInviteDetails ? (
                    <div className="flex justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : inviteDetails ? (
                    <>
                      {/* Description */}
                      {inviteDetails.description && (
                        <div>
                          <h3 className="font-semibold text-text-main mb-2">
                            {t('groupInvites.description')}
                          </h3>
                          <p className="text-text-secondary">{inviteDetails.description}</p>
                        </div>
                      )}

                      {/* Group Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                          <Users className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-text-secondary">{t('groupInvites.members')}</p>
                            <p className="font-semibold text-text-main">
                              {inviteDetails.member_count} / {inviteDetails.min_participants}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                          <Calendar className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-text-secondary">{t('groupInvites.drawDate')}</p>
                            <p className="font-semibold text-text-main">
                              {format(new Date(inviteDetails.draw_datetime), 'PPp')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                          <CalendarDays className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-text-secondary">{t('groupInvites.exchangeDate')}</p>
                            <p className="font-semibold text-text-main">
                              {format(new Date(inviteDetails.exchange_date), 'PP')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                          <UserPlus className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm text-text-secondary">{t('groupInvites.owner')}</p>
                            <p className="font-semibold text-text-main">
                              {getUserName(inviteDetails.owner)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Members List */}
                      <div>
                        <h3 className="font-semibold text-text-main mb-4">
                          {t('groupInvites.members')} ({inviteDetails.members?.length || 0})
                        </h3>
                        {inviteDetails.members && inviteDetails.members.length > 0 ? (
                          <div className="space-y-3">
                            {inviteDetails.members.map((member: any) => (
                              <div
                                key={member.id}
                                className="flex items-center gap-3 p-3 bg-surface rounded-lg"
                              >
                                <Avatar
                                  src={member.profile_picture}
                                  name={getUserName(member)}
                                  size="md"
                                />
                                <div className="flex-1">
                                  <p className="font-medium text-text-main">
                                    {getUserName(member)}
                                  </p>
                                  <p className="text-sm text-text-secondary">{member.email}</p>
                                </div>
                                {member.id === inviteDetails.owner.id && (
                                  <span className="badge-secondary">{t('groupInvites.owner')}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-text-secondary text-center py-4">
                            {t('groupInvites.noMembers')}
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-text-secondary text-center py-4">
                      {t('groupInvites.errorLoadingDetails')}
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border-soft flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (selectedInvite?.notification_id) {
                        handleRejectInvite(selectedInvite.notification_id)
                      }
                    }}
                    disabled={rejectInviteMutation.isPending || joinGroupMutation.isPending}
                    className="flex items-center gap-2 text-error border-error hover:bg-error/10"
                  >
                    <XCircle className="w-4 h-4" />
                    {t('groupInvites.reject')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedInvite(null)}
                    className="flex-1"
                  >
                    {t('groupInvites.close')}
                  </Button>
                  <Button
                    onClick={() => handleAcceptInvite(selectedInvite.group.invite_code)}
                    disabled={joinGroupMutation.isPending || rejectInviteMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {t('groupInvites.accept')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

