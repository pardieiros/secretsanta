import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { groupAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'

export default function JoinGroupPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const { isOpen, errorData, showError, hideError } = useErrorModal()

  const joinMutation = useMutation({
    mutationFn: (code: string) => groupAPI.join(code),
    onSuccess: (data) => {
      navigate(`/groups/${data.id}`)
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inviteCode.trim()) {
      joinMutation.mutate(inviteCode.trim())
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6">
      <Card>
        <h1 className="text-xl sm:text-2xl font-bold text-text-main mb-2">{t('joinGroup.title')}</h1>
        <p className="text-sm sm:text-base text-text-secondary mb-6">{t('joinGroup.subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('joinGroup.inviteCode')}
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder={t('joinGroup.inviteCodePlaceholder')}
            required
          />

          <Button type="submit" disabled={joinMutation.isPending} className="w-full">
            {joinMutation.isPending ? t('joinGroup.joining') : t('joinGroup.join')}
          </Button>
        </form>
      </Card>

      <ErrorModal
        isOpen={isOpen}
        onClose={hideError}
        title={errorData.title}
        message={errorData.message}
        errors={errorData.errors}
      />
    </div>
  )
}

