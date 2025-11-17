import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { giftIdeaAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import { useState } from 'react'

export default function GiftIdeas() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groupId = parseInt(id || '0')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '' })

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
      setShowForm(false)
      setFormData({ title: '', description: '' })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; description?: string } }) =>
      giftIdeaAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gift-ideas', groupId] })
      setEditingId(null)
      setFormData({ title: '', description: '' })
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
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-main">Gift Ideas</h1>
        <Button variant="secondary" onClick={() => navigate(`/groups/${groupId}`)}>
          Back to Group
        </Button>
      </div>

      {!showForm && canAddMore && (
        <Card className="mb-6">
          <Button onClick={() => setShowForm(true)} className="w-full">
            Add New Gift Idea
          </Button>
        </Card>
      )}

      {showForm && (
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-text-main mb-4">
            {editingId ? 'Edit Gift Idea' : 'New Gift Idea'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g., Wireless Headphones"
            />
            <Textarea
              label="Description (Optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Any additional details or preferences..."
            />
            <div className="flex space-x-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? 'Update' : 'Add'} Idea
              </Button>
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!canAddMore && !showForm && (
        <Card className="mb-6 bg-warning/10 border-warning">
          <p className="text-warning font-medium">
            You've reached the maximum of 5 gift ideas per group.
          </p>
        </Card>
      )}

      {ideas.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-text-secondary mb-4">No gift ideas yet.</p>
          {canAddMore && (
            <Button onClick={() => setShowForm(true)}>Add Your First Idea</Button>
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
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this idea?')) {
                        deleteMutation.mutate(idea.id)
                      }
                    }}
                    className="text-sm px-4 py-2 text-error border-error hover:bg-error/10"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

