import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

type Tab = 'search' | 'friends' | 'requests'

interface SocialTabsProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  friendsCount: number
  pendingRequestsCount: number
}

export default function SocialTabs({
  activeTab,
  onTabChange,
  friendsCount,
  pendingRequestsCount,
}: SocialTabsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex space-x-2 mb-6 border-b border-border-soft">
      <button
        onClick={() => onTabChange('search')}
        className={`px-6 py-3 font-medium transition-colors relative ${
          activeTab === 'search'
            ? 'text-primary'
            : 'text-text-secondary hover:text-text-main'
        }`}
      >
        {t('social.search')}
        {activeTab === 'search' && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          />
        )}
      </button>
      <button
        onClick={() => onTabChange('friends')}
        className={`px-6 py-3 font-medium transition-colors relative ${
          activeTab === 'friends'
            ? 'text-primary'
            : 'text-text-secondary hover:text-text-main'
        }`}
      >
        {t('social.friends')} ({friendsCount})
        {activeTab === 'friends' && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          />
        )}
      </button>
      <button
        onClick={() => onTabChange('requests')}
        className={`px-6 py-3 font-medium transition-colors relative ${
          activeTab === 'requests'
            ? 'text-primary'
            : 'text-text-secondary hover:text-text-main'
        }`}
      >
        {t('social.requests')}
        {pendingRequestsCount > 0 && (
          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-secondary-light text-text-on-light">
            {pendingRequestsCount}
          </span>
        )}
        {activeTab === 'requests' && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
          />
        )}
      </button>
    </div>
  )
}


