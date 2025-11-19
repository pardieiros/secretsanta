import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { groupAPI } from '../lib/api'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import Card from '../components/Card'
import LocationPicker from '../components/LocationPicker'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'

export default function CreateGroup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isOpen, errorData, showError, hideError } = useErrorModal()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    min_participants: 2,
    draw_datetime: '',
    exchange_date: '',
    auto_draw_enabled: false,
    visibility: 'private' as 'private' | 'public',
    location_name: '',
    location_latitude: null as number | null,
    location_longitude: null as number | null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const createMutation = useMutation({
    mutationFn: groupAPI.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate(`/groups/${data.id}`)
    },
    onError: (err: any) => {
      console.error('Create group error:', err)
      console.error('Error response:', err.response?.data)
      handleApiError(err, showError)
      const errorData = err.response?.data
      if (typeof errorData === 'object') {
        if (errorData.errors) {
          setErrors(errorData.errors)
        } else if (errorData.error) {
          setErrors({ general: errorData.error })
        }
      }
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      newErrors.min_participants = t('createGroup.errors.minParticipants')
    }
    if (formData.draw_datetime && formData.exchange_date) {
      const drawDate = new Date(formData.draw_datetime)
      const exchangeDate = new Date(formData.exchange_date)
      if (drawDate >= exchangeDate) {
        newErrors.draw_datetime = t('createGroup.errors.drawDateBeforeExchange')
      }
    }
    
    if (formData.visibility === 'public') {
      if (!formData.location_name || formData.location_latitude === null || formData.location_longitude === null) {
        newErrors.location_name = t('createGroup.errors.locationRequired')
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const submitData: any = {
      name: formData.name,
      description: formData.description || '',
      min_participants: Number(formData.min_participants),
      draw_datetime: formData.draw_datetime,
      exchange_date: formData.exchange_date,
      auto_draw_enabled: formData.auto_draw_enabled,
      visibility: formData.visibility,
    }

    if (formData.visibility === 'public') {
      // For public groups, ensure coordinates are strings (for DecimalField in Django)
      submitData.location_name = formData.location_name || ''
      if (formData.location_latitude !== null && formData.location_longitude !== null) {
        submitData.location_latitude = String(formData.location_latitude)
        submitData.location_longitude = String(formData.location_longitude)
      }
    }
    // For private groups, don't include location fields at all (they will default to null in the model)

    console.log('Submitting data:', JSON.stringify(submitData, null, 2))
    createMutation.mutate(submitData)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-6 sm:mb-8">{t('createGroup.title')}</h1>
      
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label={t('createGroup.groupName')}
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            error={errors.name}
            placeholder={t('createGroup.groupNamePlaceholder')}
          />

          <Textarea
            label={t('createGroup.description')}
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder={t('createGroup.descriptionPlaceholder')}
          />

          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              {t('createGroup.visibility')}
            </label>
            <select
              name="visibility"
              value={formData.visibility}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border-soft rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-text-main"
            >
              <option value="private">{t('createGroup.private')}</option>
              <option value="public">{t('createGroup.public')}</option>
            </select>
          </div>

          {formData.visibility === 'public' && (
            <div className="space-y-4 p-4 bg-surface rounded-lg">
              <h3 className="font-medium text-text-main mb-2">{t('createGroup.location')}</h3>
              <p className="text-sm text-text-secondary mb-4">{t('createGroup.locationHint')}</p>
              <Input
                label={t('createGroup.locationName')}
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                required
                error={errors.location_name}
                placeholder={t('createGroup.locationNamePlaceholder')}
              />
              <LocationPicker
                latitude={formData.location_latitude}
                longitude={formData.location_longitude}
                onLocationChange={(lat, lng) => {
                  setFormData({
                    ...formData,
                    location_latitude: lat,
                    location_longitude: lng,
                  })
                }}
                height="400px"
              />
              {formData.location_latitude !== null && formData.location_longitude !== null && (
                <div className="text-sm text-text-secondary">
                  <p>
                    {t('createGroup.selectedCoordinates')}: {formData.location_latitude.toFixed(6)}, {formData.location_longitude.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          )}

          <Input
            label={t('createGroup.minParticipants')}
            type="number"
            name="min_participants"
            value={formData.min_participants}
            onChange={handleChange}
            required
            min={2}
            error={errors.min_participants}
          />

          <Input
            label={t('createGroup.drawDateTime')}
            type="datetime-local"
            name="draw_datetime"
            value={formData.draw_datetime}
            onChange={handleChange}
            required
            error={errors.draw_datetime}
          />

          <Input
            label={t('createGroup.exchangeDate')}
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
              {t('createGroup.autoDrawEnabled')}
            </label>
          </div>

          <div className="flex space-x-4 pt-4">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('createGroup.creating') : t('createGroup.create')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/dashboard')}
            >
              {t('createGroup.cancel')}
            </Button>
          </div>
        </form>
      </Card>

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

