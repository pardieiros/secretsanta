import { useTranslation } from 'react-i18next'
import { Bell, BellOff, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { usePushNotifications } from '../hooks/usePushNotifications'
import Button from './Button'
import Card from './Card'

export default function PushNotificationsSettings() {
  const { t } = useTranslation()
  const { status, isLoading, error, subscribe, unsubscribe, testNotification } =
    usePushNotifications()

  const getStatusIcon = () => {
    switch (status) {
      case 'enabled':
        return <CheckCircle className="w-5 h-5 text-success" />
      case 'blocked':
        return <AlertCircle className="w-5 h-5 text-secondary" />
      case 'unsupported':
        return <AlertCircle className="w-5 h-5 text-text-secondary" />
      default:
        return <BellOff className="w-5 h-5 text-text-secondary" />
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'enabled':
        return t('pushNotifications.status.enabled')
      case 'blocked':
        return t('pushNotifications.status.blocked')
      case 'unsupported':
        return t('pushNotifications.status.unsupported')
      default:
        return t('pushNotifications.status.disabled')
    }
  }

  const getStatusDescription = () => {
    switch (status) {
      case 'enabled':
        return t('pushNotifications.status.enabledDescription')
      case 'blocked':
        return t('pushNotifications.status.blockedDescription')
      case 'unsupported':
        return t('pushNotifications.status.unsupportedDescription')
      default:
        return t('pushNotifications.status.disabledDescription')
    }
  }

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-text-main mb-1">
              {t('pushNotifications.title')}
            </h3>
            <p className="text-sm text-text-secondary">
              {t('pushNotifications.description')}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 p-4 bg-surface rounded-lg border border-border-soft">
          {getStatusIcon()}
          <div className="flex-1">
            <p className="font-semibold text-text-main">{getStatusText()}</p>
            <p className="text-sm text-text-secondary">{getStatusDescription()}</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <p className="font-semibold text-secondary mb-1">{t('pushNotifications.error')}</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {status === 'disabled' && (
            <Button
              variant="primary"
              onClick={subscribe}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('pushNotifications.activating')}
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  {t('pushNotifications.activate')}
                </>
              )}
            </Button>
          )}

          {status === 'enabled' && (
            <>
              <Button
                variant="secondary"
                onClick={unsubscribe}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('pushNotifications.deactivating')}
                  </>
                ) : (
                  <>
                    <BellOff className="w-4 h-4" />
                    {t('pushNotifications.deactivate')}
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={testNotification}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {t('pushNotifications.test')}
              </Button>
            </>
          )}

          {status === 'blocked' && (
            <div className="w-full p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-text-secondary mb-2">
                {t('pushNotifications.blockedInstructions')}
              </p>
              <ol className="list-decimal list-inside text-sm text-text-secondary space-y-1">
                <li>{t('pushNotifications.blockedStep1')}</li>
                <li>{t('pushNotifications.blockedStep2')}</li>
                <li>{t('pushNotifications.blockedStep3')}</li>
              </ol>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pt-4 border-t border-border-soft">
          <p className="text-xs text-text-secondary">
            {t('pushNotifications.info')}
          </p>
        </div>
      </div>
    </Card>
  )
}

