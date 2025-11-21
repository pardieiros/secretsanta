import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { friendshipAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import SocialTabs from '../components/pages/social/SocialTabs'
import SearchTab from '../components/pages/social/SearchTab'
import FriendsTab from '../components/pages/social/FriendsTab'
import RequestsTab from '../components/pages/social/RequestsTab'

type Tab = 'search' | 'friends' | 'requests'

export default function Social() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<Tab>('search')
  
  // Check if we should activate a specific tab from location state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab as Tab)
      // Clear the state to avoid keeping it on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  // Get friends
  const { data: friends = [], isLoading: isLoadingFriends } = useQuery({
    queryKey: ['friends', 'list'],
    queryFn: () => friendshipAPI.getFriends(),
  })

  // Get friend requests
  const { data: requestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['friendships'],
    queryFn: () => friendshipAPI.list(),
  })

  // Handle paginated response
  const requests = requestsData?.results || requestsData || []
  const pendingRequests = Array.isArray(requests) 
    ? requests.filter((r: any) => r.status === 'pending' && r.addressee?.id === user?.id)
    : []

  const getUserName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
  }

  return (
    <div className="px-4 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('social.title')}</h1>
        <p className="text-sm sm:text-base text-text-secondary">{t('social.subtitle')}</p>
      </div>

      <SocialTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        friendsCount={friends.length}
        pendingRequestsCount={pendingRequests.length}
      />

      {activeTab === 'search' && <SearchTab getUserName={getUserName} />}
      {activeTab === 'friends' && (
        <FriendsTab
          friends={friends}
          isLoading={isLoadingFriends}
          getUserName={getUserName}
        />
      )}
      {activeTab === 'requests' && (
        <RequestsTab
          pendingRequests={pendingRequests}
          isLoading={isLoadingRequests}
          getUserName={getUserName}
        />
      )}
    </div>
  )
}

