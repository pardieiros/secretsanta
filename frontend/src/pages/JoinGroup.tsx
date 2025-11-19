import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { groupAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import { useAuth } from '../contexts/AuthContext'

export default function JoinGroup() {
  const { inviteCode } = useParams<{ inviteCode: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [error, setError] = useState('')

  const joinMutation = useMutation({
    mutationFn: (code: string) => groupAPI.join(code),
    onSuccess: (data) => {
      navigate(`/groups/${data.id}`)
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to join group')
    },
  })

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { redirect: `/join/${inviteCode}` } })
    }
  }, [user, navigate, inviteCode])

  const handleJoin = () => {
    if (inviteCode) {
      joinMutation.mutate(inviteCode)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-8 sm:py-12 px-4">
      <Card className="max-w-md w-full px-4 sm:px-6">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">Join Group</h1>
          <p className="text-sm sm:text-base text-text-secondary">You've been invited to join a Secret Santa group!</p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-text-secondary mb-4">
              Click the button below to join this group.
            </p>
          </div>

          <Button
            onClick={handleJoin}
            disabled={joinMutation.isPending}
            className="w-full"
          >
            {joinMutation.isPending ? 'Joining...' : 'Join Group'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}

