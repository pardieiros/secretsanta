import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupAPI } from '../lib/api'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import Card from '../components/Card'

export default function CreateGroup() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min_participants: 2,
    draw_datetime: '',
    exchange_date: '',
    auto_draw_enabled: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useMutation({
    mutationFn: groupAPI.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate(`/groups/${data.id}`)
    },
    onError: (err: any) => {
      const errorData = err.response?.data
      if (typeof errorData === 'object') {
        setErrors(errorData)
      }
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    
    // Validation
    const newErrors: Record<string, string> = {}
    if (formData.min_participants < 2) {
      newErrors.min_participants = 'Minimum participants must be at least 2'
    }
    if (formData.draw_datetime && formData.exchange_date) {
      const drawDate = new Date(formData.draw_datetime)
      const exchangeDate = new Date(formData.exchange_date)
      if (drawDate >= exchangeDate) {
        newErrors.draw_datetime = 'Draw date must be before exchange date'
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    createMutation.mutate(formData)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-text-main mb-8">Create New Group</h1>
      
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Group Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            error={errors.name}
            placeholder="Family Secret Santa 2024"
          />

          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Optional description for your group"
          />

          <Input
            label="Minimum Participants"
            type="number"
            name="min_participants"
            value={formData.min_participants}
            onChange={handleChange}
            required
            min={2}
            error={errors.min_participants}
          />

          <Input
            label="Draw Date & Time"
            type="datetime-local"
            name="draw_datetime"
            value={formData.draw_datetime}
            onChange={handleChange}
            required
            error={errors.draw_datetime}
          />

          <Input
            label="Exchange Date"
            type="date"
            name="exchange_date"
            value={formData.exchange_date}
            onChange={handleChange}
            required
            error={errors.exchange_date}
          />

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="auto_draw_enabled"
              name="auto_draw_enabled"
              checked={formData.auto_draw_enabled}
              onChange={handleChange}
              className="w-5 h-5 text-primary border-border-soft rounded focus:ring-primary"
            />
            <label htmlFor="auto_draw_enabled" className="text-text-main">
              Automatically trigger draw when conditions are met
            </label>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Group'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

