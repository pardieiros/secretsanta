import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { groupAPI, giftIdeaAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import { useState } from 'react'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groupId = parseInt(id || '0')
  const [inviteEmail, setInviteEmail] = useState('')
  const [showInviteEmail, setShowInviteEmail] = useState(false)

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

  const drawMutation = useMutation({
    mutationFn: () => groupAPI.draw(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      alert('Draw is being processed! Please refresh in a moment.')
    },
  })

  const inviteEmailMutation = useMutation({
    mutationFn: (email: string) => groupAPI.sendInviteEmail(groupId, email),
    onSuccess: () => {
      alert('Invitation email sent!')
      setInviteEmail('')
      setShowInviteEmail(false)
    },
  })

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/join/${group?.invite_code}`
    navigator.clipboard.writeText(inviteLink)
    alert('Invite link copied to clipboard!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!group) {
    return <Card><p className="text-error">Group not found</p></Card>
  }

  const today = new Date()
  const exchangeDate = new Date(group.exchange_date)
  const canReveal = today >= exchangeDate

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-text-main mb-2">{group.name}</h1>
          {group.description && (
            <p className="text-text-secondary">{group.description}</p>
          )}
        </div>
        {group.is_owner && (
          <Link to={`/groups/${groupId}/edit`}>
            <Button variant="secondary">Edit Group</Button>
          </Link>
        )}
      </div>

      {/* Group Info */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-text-main mb-2">Draw Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Draw Date:</span>
                <span className="font-medium">{format(new Date(group.draw_datetime), 'PPpp')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Exchange Date:</span>
                <span className="font-medium">{format(new Date(group.exchange_date), 'PP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Participants:</span>
                <span className="font-medium">
                  {group.member_count} / {group.min_participants}
                </span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-text-main mb-2">Status</h3>
            <div className="space-y-2">
              {group.is_drawn ? (
                <span className="badge-success">Draw Completed</span>
              ) : group.can_draw ? (
                <span className="badge-warning">Ready to Draw</span>
              ) : (
                <span className="badge bg-gray-400 text-white">Pending</span>
              )}
              {group.auto_draw_enabled && (
                <span className="badge-secondary ml-2">Auto-draw Enabled</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Invite Section */}
      {group.is_owner && !group.is_drawn && (
        <Card>
          <h3 className="font-semibold text-text-main mb-4">Invite Members</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Invite Link
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/join/${group.invite_code}`}
                  className="input-field flex-1"
                />
                <Button onClick={copyInviteLink}>Copy</Button>
              </div>
            </div>
            
            {!showInviteEmail ? (
              <Button variant="secondary" onClick={() => setShowInviteEmail(true)}>
                Send Email Invitation
              </Button>
            ) : (
              <div className="flex space-x-2">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input-field flex-1"
                />
                <Button
                  onClick={() => inviteEmailMutation.mutate(inviteEmail)}
                  disabled={!inviteEmail || inviteEmailMutation.isPending}
                >
                  Send
                </Button>
                <Button variant="secondary" onClick={() => setShowInviteEmail(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Draw Button */}
      {group.is_owner && !group.is_drawn && (
        <Card>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-text-main mb-2">Ready to Draw?</h3>
              <p className="text-sm text-text-secondary">
                {group.can_draw
                  ? 'All conditions are met. Click the button to perform the draw.'
                  : 'Waiting for more participants or draw date.'}
              </p>
            </div>
            <Button
              onClick={() => drawMutation.mutate()}
              disabled={!group.can_draw || drawMutation.isPending}
            >
              {drawMutation.isPending ? 'Drawing...' : 'Run Draw'}
            </Button>
          </div>
        </Card>
      )}

      {/* Members */}
      <Card>
        <h3 className="font-semibold text-text-main mb-4">Members ({members?.length || 0})</h3>
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
                <span className="badge-secondary ml-auto">Owner</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* My Assignment */}
      {group.is_drawn && myAssignment && (
        <Card>
          <h3 className="font-semibold text-text-main mb-4">My Assignment</h3>
          {myAssignment.receiver ? (
            <div>
              <p className="text-text-secondary mb-2">You are giving a gift to:</p>
              <p className="text-xl font-bold text-text-main mb-4">
                {myAssignment.receiver.first_name} {myAssignment.receiver.last_name}
                <span className="text-text-secondary text-base font-normal ml-2">
                  ({myAssignment.receiver.email})
                </span>
              </p>
              
              <Link to={`/groups/${groupId}/gift-ideas`}>
                <Button variant="secondary" className="mb-4">
                  Manage My Gift Ideas
                </Button>
              </Link>

              {receiverIdeas && receiverIdeas.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-text-main mb-2">Their Gift Ideas:</h4>
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
            <p className="text-text-secondary">No assignment found.</p>
          )}
        </Card>
      )}

      {/* Who Drew Me */}
      {group.is_drawn && (
        <Card>
          <h3 className="font-semibold text-text-main mb-4">Who Drew Me?</h3>
          {canReveal && whoDrewMe?.giver ? (
            <div>
              <span className="badge-secondary mb-4 inline-block">Amigo Secreto Revelado</span>
              <p className="text-text-secondary mb-2">Your Secret Santa is:</p>
              <p className="text-xl font-bold text-text-main">
                {whoDrewMe.giver.first_name} {whoDrewMe.giver.last_name}
                <span className="text-text-secondary text-base font-normal ml-2">
                  ({whoDrewMe.giver.email})
                </span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-warning font-medium mb-2">
                Revelation will happen on {format(exchangeDate, 'PP')}
              </p>
              <p className="text-text-secondary text-sm">
                Check back after the exchange date to see who drew you!
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Gift Ideas Link */}
      <Card>
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-text-main mb-2">Gift Ideas</h3>
            <p className="text-sm text-text-secondary">
              Add up to 5 gift ideas to help your Secret Santa choose the perfect gift!
            </p>
          </div>
          <Link to={`/groups/${groupId}/gift-ideas`}>
            <Button variant="secondary">Manage Gift Ideas</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

