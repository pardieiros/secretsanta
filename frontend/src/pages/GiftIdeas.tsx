import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { giftIdeaAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import { useState } from 'react'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'

export default function GiftIdeas() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groupId = parseInt(id || '0')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { isOpen, errorData, showError, hideError } = useErrorModal()

  const { data: ideasData, isLoading } = useQuery({
    queryKey: ['gift-ideas', groupId],
    queryFn: () => giftIdeaAPI.list(groupId),
  })

  // Handle paginated response
  const ideas = ideasData?.results || ideasData || []

  const createMutation = useMutation({
    mutationFn: (data: { group: number; title: string; description?: string }) =>
      giftIdeaAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-ideas', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'members_without_gift_ideas'] })
      setShowForm(false)
      setFormData({ title: '', description: '' })
      setErrors({})
    },
    onError: (error: any) => {
      handleApiError(error, showError)
      const errorData = error.response?.data
      if (errorData && typeof errorData === 'object') {
        // Handle field-specific errors
        const fieldErrors: Record<string, string> = {}
        Object.keys(errorData).forEach((key) => {
          if (Array.isArray(errorData[key])) {
            fieldErrors[key] = errorData[key][0]
          } else if (typeof errorData[key] === 'string') {
            fieldErrors[key] = errorData[key]
          }
        })
        setErrors(fieldErrors)
      }
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; description?: string } }) =>
      giftIdeaAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-ideas', groupId] })
      queryClient.invalidateQueries({ queryKey: ['group', groupId, 'members_without_gift_ideas'] })
      setEditingId(null)
      setFormData({ title: '', description: '' })
      setErrors({})
    },
    onError: (error: any) => {
      handleApiError(error, showError)
      const errorData = error.response?.data
      if (errorData && typeof errorData === 'object') {
        // Handle field-specific errors
        const fieldErrors: Record<string, string> = {}
        Object.keys(errorData).forEach((key) => {
          if (Array.isArray(errorData[key])) {
            fieldErrors[key] = errorData[key][0]
          } else if (typeof errorData[key] === 'string') {
            fieldErrors[key] = errorData[key]
          }
        })
        setErrors(fieldErrors)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => giftIdeaAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-ideas', groupId] })
    },
  })

  const handleEdit = (idea: any) => {
    setEditingId(idea.id)
    setFormData({ title: idea.title, description: idea.description || '' })
    setShowForm(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData })
    } else {
      createMutation.mutate({ group: groupId, ...formData })
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({ title: '', description: '' })
    setErrors({})
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  const canAddMore = ideas.length < 5

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main">{t('giftIdeas.title')}</h1>
        <Button variant="secondary" onClick={() => navigate(`/groups/${groupId}`)} className="w-full sm:w-auto">
          {t('giftIdeas.backToGroup')}
        </Button>
      </div>

      {!showForm && canAddMore && (
        <Card className="mb-6">
          <Button onClick={() => setShowForm(true)} className="w-full">
            {t('giftIdeas.addNew')}
          </Button>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-text-main mb-4">
            {editingId ? t('giftIdeas.editTitle') : t('giftIdeas.newTitle')}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('giftIdeas.titleLabel')}
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value })
                if (errors.title) {
                  setErrors({ ...errors, title: '' })
                }
              }}
              required
              placeholder={t('giftIdeas.titlePlaceholder')}
              error={errors.title}
            />
            <Textarea
              label={t('giftIdeas.descriptionLabel')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder={t('giftIdeas.descriptionPlaceholder')}
            />
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? t('giftIdeas.update') : t('giftIdeas.add')} {t('giftIdeas.idea')}
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                {t('giftIdeas.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!canAddMore && !showForm && (
        <Card className="mb-6 bg-warning/10 border-warning">
          <p className="text-warning font-medium">
            {t('giftIdeas.maxReached')}
          </p>
        </Card>
      )}

      {ideas.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-secondary mb-4">{t('giftIdeas.noIdeas')}</p>
          {canAddMore && (
            <Button onClick={() => setShowForm(true)}>{t('giftIdeas.addFirst')}</Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {ideas.map((idea: any) => (
            <Card key={idea.id}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-text-main mb-2">{idea.title}</h3>
                  {idea.description && (
                    <p className="text-text-secondary">{idea.description}</p>
                  )}
                </div>
                <div className="flex space-x-2 ml-4">
                  <Button
                    variant="secondary"
                    onClick={() => handleEdit(idea)}
                    className="text-sm px-4 py-2"
                  >
                    {t('giftIdeas.edit')}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm(t('giftIdeas.deleteConfirm'))) {
                        deleteMutation.mutate(idea.id)
                      }
                    }}
                    className="text-sm px-4 py-2 text-error border-error hover:bg-error/10"
                  >
                    {t('giftIdeas.delete')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
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

