import { useTranslation } from 'react-i18next'
import Button from '../../Button'
import Input from '../../Input'

interface RevealModalProps {
  isOpen: boolean
  revealDatetime: string
  isPending: boolean
  onClose: () => void
  onDatetimeChange: (datetime: string) => void
  onSchedule: () => void
}

export default function RevealModal({
  isOpen,
  revealDatetime,
  isPending,
  onClose,
  onDatetimeChange,
  onSchedule,
}: RevealModalProps) {
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text-main mb-4">
          {t('groupDetail.scheduleReveal')}
        </h3>
        <Input
          label={t('groupDetail.revealDatetime')}
          type="datetime-local"
          value={revealDatetime}
          onChange={(e) => onDatetimeChange(e.target.value)}
          required
        />
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onSchedule}
            disabled={!revealDatetime || isPending}
            className="flex-1"
          >
            {t('groupDetail.schedule')}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t('groupDetail.cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}

