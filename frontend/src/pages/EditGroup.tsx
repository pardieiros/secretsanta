import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Settings, Users, Trash2, ArrowLeft } from 'lucide-react'
import { groupAPI } from '../lib/api'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import Card from '../components/Card'
import Avatar from '../components/Avatar'
import LocationPicker from '../components/LocationPicker'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'

type Tab = 'settings' | 'permissions'

export default function EditGroup() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const groupId = parseInt(id || '0')
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  const { isOpen, errorData, showError, hideError } = useErrorModal()

  const { data: group, isLoading } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupAPI.get(groupId),
  })

  const { data: members = [] } = useQuery({
    queryKey: ['group', groupId, 'members'],
    queryFn: () => groupAPI.getMembers(groupId),
    enabled: !!group && group.is_owner,
  })

  const { data: permissions = [], refetch: refetchPermissions } = useQuery({
    queryKey: ['group', groupId, 'permissions'],
    queryFn: () => groupAPI.getPermissions(groupId),
    enabled: !!group && group.is_owner && activeTab === 'permissions',
  })

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (group) {
      const drawDate = new Date(group.draw_datetime)
      const exchangeDate = new Date(group.exchange_date)
      
      setFormData({
        name: group.name,
        description: group.description || '',
        min_participants: group.min_participants,
        draw_datetime: drawDate.toISOString().slice(0, 16),
        exchange_date: exchangeDate.toISOString().slice(0, 10),
        auto_draw_enabled: group.auto_draw_enabled || false,
        visibility: group.visibility || 'private',
        location_name: group.location_name || '',
        location_latitude: group.location_latitude ? parseFloat(group.location_latitude) : null,
        location_longitude: group.location_longitude ? parseFloat(group.location_longitude) : null,
      })
    }
  }, [group])

  const updateMutation = useMutation({
    mutationFn: (data: any) => groupAPI.update(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate(`/groups/${groupId}`)
    },
    onError: (err: any) => {
      handleApiError(err, showError)
      const errorData = err.response?.data
      if (typeof errorData === 'object' && errorData.errors) {
        setErrors(errorData.errors)
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => groupAPI.delete(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      navigate('/groups')
    },
    onError: (err: any) => {
      handleApiError(err, showError)
    },
  })

  const updatePermissionMutation = useMutation({
    mutationFn: ({ userId, permissions }: { userId: number; permissions: any }) =>
      groupAPI.updatePermission(groupId, userId, permissions),
    onSuccess: () => {
      refetchPermissions()
      queryClient.invalidateQueries({ queryKey: ['group', groupId] })
    },
    onError: (err: any) => {
      handleApiError(err, showError)
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
    if (formData.min_participants < 3) {
      newErrors.min_participants = t('editGroup.errors.minParticipants')
    }
    if (formData.draw_datetime && formData.exchange_date) {
      const drawDate = new Date(formData.draw_datetime)
      const exchangeDate = new Date(formData.exchange_date)
      if (drawDate >= exchangeDate) {
        newErrors.draw_datetime = t('editGroup.errors.drawDateBeforeExchange')
      }
    }
    
    if (formData.visibility === 'public') {
      if (!formData.location_name || formData.location_latitude === null || formData.location_longitude === null) {
        newErrors.location_name = t('editGroup.errors.locationRequired')
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
      // For public groups, ensure coordinates are strings (for DecimalField)
      submitData.location_name = formData.location_name || ''
      submitData.location_latitude = formData.location_latitude !== null ? String(formData.location_latitude) : null
      submitData.location_longitude = formData.location_longitude !== null ? String(formData.location_longitude) : null
    } else {
      // For private groups, set to null to clear existing values
      submitData.location_name = null
      submitData.location_latitude = null
      submitData.location_longitude = null
    }

    updateMutation.mutate(submitData)
  }

  const handlePermissionChange = (userId: number, permission: string, value: boolean) => {
    const currentPermission = permissions.find((p: any) => p.user.id === userId)
    const currentPermissions = currentPermission
      ? {
          can_edit_settings: currentPermission.can_edit_settings,
          can_invite_members: currentPermission.can_invite_members,
          can_send_messages: currentPermission.can_send_messages,
        }
      : {
          can_edit_settings: false,
          can_invite_members: false,
          can_send_messages: false,
        }

    updatePermissionMutation.mutate({
      userId,
      permissions: {
        ...currentPermissions,
        [permission]: value,
      },
    })
  }

  const handleDelete = () => {
    if (showDeleteConfirm) {
      deleteMutation.mutate()
    } else {
      setShowDeleteConfirm(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!group || !group.is_owner) {
    return (
      <Card>
        <p className="text-error">{t('editGroup.noPermission')}</p>
      </Card>
    )
  }

  const membersWithoutOwner = members.filter((m: any) => m.user.id !== group.owner.id)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
        <button
          onClick={() => navigate(`/groups/${groupId}`)}
          className="p-2 hover:bg-surface rounded-lg transition-colors"
          aria-label={t('editGroup.backToGroup')}
        >
          <ArrowLeft className="w-5 h-5 text-text-main" />
        </button>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-text-main flex-1 truncate">{t('editGroup.title')}</h1>
        <div>
          {showDeleteConfirm ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t('editGroup.cancelDelete')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {t('editGroup.confirmDelete')}
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={handleDelete}
            className="text-red-600 hover:bg-red-50 border-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('editGroup.deleteGroup')}
          </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-border-soft">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'settings'
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-main'
          }`}
        >
          <Settings className="w-4 h-4" />
          {t('editGroup.settings')}
          {activeTab === 'settings' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'permissions'
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-main'
          }`}
        >
          <Users className="w-4 h-4" />
          {t('editGroup.permissions')}
          {activeTab === 'permissions' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label={t('editGroup.groupName')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              error={errors.name}
            />

            <Textarea
              label={t('editGroup.description')}
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
            />

            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                {t('editGroup.visibility')}
              </label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border-soft rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-surface text-text-main"
              >
                <option value="private">{t('editGroup.private')}</option>
                <option value="public">{t('editGroup.public')}</option>
              </select>
            </div>

            {formData.visibility === 'public' && (
              <div className="space-y-4 p-4 bg-surface rounded-lg">
                <h3 className="font-medium text-text-main mb-2">{t('editGroup.location')}</h3>
                <p className="text-sm text-text-secondary mb-4">{t('editGroup.locationHint')}</p>
                <Input
                  label={t('editGroup.locationName')}
                  name="location_name"
                  value={formData.location_name}
                  onChange={handleChange}
                  required
                  error={errors.location_name}
                  placeholder={t('editGroup.locationNamePlaceholder')}
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
                      {t('editGroup.selectedCoordinates')}: {formData.location_latitude.toFixed(6)}, {formData.location_longitude.toFixed(6)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Input
              label={t('editGroup.minParticipants')}
              type="number"
              name="min_participants"
              value={formData.min_participants}
              onChange={handleChange}
              required
              min={3}
              error={errors.min_participants}
            />

            <Input
              label={t('editGroup.drawDateTime')}
              type="datetime-local"
              name="draw_datetime"
              value={formData.draw_datetime}
              onChange={handleChange}
              required
              error={errors.draw_datetime}
            />

            <Input
              label={t('editGroup.exchangeDate')}
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
                {t('editGroup.autoDrawEnabled')}
              </label>
            </div>

            <div className="flex space-x-4 pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? t('editGroup.saving') : t('editGroup.save')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(`/groups/${groupId}`)}
              >
                {t('editGroup.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <Card>
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-text-main mb-2">{t('editGroup.permissionsTitle')}</h2>
              <p className="text-text-secondary text-sm">{t('editGroup.permissionsDescription')}</p>
            </div>

            {membersWithoutOwner.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary">{t('editGroup.noMembers')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {membersWithoutOwner.map((membership: any) => {
                  const permission = permissions.find((p: any) => p.user.id === membership.user.id)
                  const userName = membership.user.first_name && membership.user.last_name
                    ? `${membership.user.first_name} ${membership.user.last_name}`
                    : membership.user.email

                  return (
                    <div key={membership.id} className="border border-border-soft rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <Avatar
                          src={membership.user.profile_picture}
                          name={userName}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-text-main">{userName}</p>
                          <p className="text-sm text-text-secondary">{membership.user.email}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-text-main">
                            {t('editGroup.canEditSettings')}
                          </label>
                          <input
                            type="checkbox"
                            checked={permission?.can_edit_settings || false}
                            onChange={(e) =>
                              handlePermissionChange(membership.user.id, 'can_edit_settings', e.target.checked)
                            }
                            disabled={updatePermissionMutation.isPending}
                            className="w-5 h-5 text-primary border-border-soft rounded focus:ring-primary"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm text-text-main">
                            {t('editGroup.canInviteMembers')}
                          </label>
                          <input
                            type="checkbox"
                            checked={permission?.can_invite_members || false}
                            onChange={(e) =>
                              handlePermissionChange(membership.user.id, 'can_invite_members', e.target.checked)
                            }
                            disabled={updatePermissionMutation.isPending}
                            className="w-5 h-5 text-primary border-border-soft rounded focus:ring-primary"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <label className="text-sm text-text-main">
                            {t('editGroup.canSendMessages')}
                          </label>
                          <input
                            type="checkbox"
                            checked={permission?.can_send_messages || false}
                            onChange={(e) =>
                              handlePermissionChange(membership.user.id, 'can_send_messages', e.target.checked)
                            }
                            disabled={updatePermissionMutation.isPending}
                            className="w-5 h-5 text-primary border-border-soft rounded focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
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
