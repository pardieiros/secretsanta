import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Save, User, Mail, Phone } from 'lucide-react'
import { userAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/Avatar'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'
import PushNotificationsSettings from '../components/PushNotificationsSettings'

export default function Settings() {
  const { t } = useTranslation()
  const { user, setUser } = useAuth()
  const queryClient = useQueryClient()
  const { isOpen, errorData, showError, hideError } = useErrorModal()

  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profile_picture: user?.profile_picture || '',
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => userAPI.updateProfile(data),
    onSuccess: (data) => {
      setUser(data.user)
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData({ ...formData, profile_picture: reader.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const getUserName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-main mb-2">{t('settings.title')}</h1>
        <p className="text-text-secondary">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture Section */}
        <Card className="lg:col-span-1">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar
                src={formData.profile_picture}
                name={getUserName()}
                size="xl"
              />
            </div>
            <label className="inline-block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button variant="secondary" className="w-full">
                {t('settings.changePhoto')}
              </Button>
            </label>
          </div>
        </Card>

        {/* Form Section */}
        <Card className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-text-main mb-2">
                  <User className="w-4 h-4" />
                  <span>{t('settings.firstName')}</span>
                </label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder={t('settings.firstNamePlaceholder')}
                />
              </div>

              <div>
                <label className="flex items-center space-x-2 text-sm font-medium text-text-main mb-2">
                  <User className="w-4 h-4" />
                  <span>{t('settings.lastName')}</span>
                </label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder={t('settings.lastNamePlaceholder')}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-text-main mb-2">
                <Mail className="w-4 h-4" />
                <span>{t('settings.email')}</span>
              </label>
              <Input
                type="email"
                value={formData.email}
                disabled
                className="bg-surface cursor-not-allowed"
              />
              <p className="text-xs text-text-secondary mt-1">{t('settings.emailNote')}</p>
            </div>

            <div>
              <label className="flex items-center space-x-2 text-sm font-medium text-text-main mb-2">
                <Phone className="w-4 h-4" />
                <span>{t('settings.phone')}</span>
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder={t('settings.phonePlaceholder')}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{t('settings.save')}</span>
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Push Notifications Settings */}
      <div className="mt-6">
        <PushNotificationsSettings />
      </div>

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

