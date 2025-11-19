import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, UserPlus, Check, X, Users, MessageCircle, Mail } from 'lucide-react'
import { friendshipAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import Avatar from '../components/Avatar'
import Card from '../components/Card'
import Button from '../components/Button'
import AddFriendModal from '../components/AddFriendModal'
import { useErrorModal } from '../hooks/useErrorModal'
import ErrorModal from '../components/ErrorModal'
import { handleApiError } from '../utils/errorHandler'

type Tab = 'search' | 'friends' | 'requests'

export default function Social() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const queryClient = useQueryClient()
  const { isOpen, errorData, showError, hideError } = useErrorModal()

  // Search users
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['friends', 'search', searchQuery],
    queryFn: () => friendshipAPI.search(searchQuery),
    enabled: activeTab === 'search' && searchQuery.length > 0,
  })

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

  // Send friend request
  const sendRequestMutation = useMutation({
    mutationFn: (userId: number) => friendshipAPI.sendRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'search'] })
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  // Accept/Reject friend request
  const acceptMutation = useMutation({
    mutationFn: (friendshipId: number) => friendshipAPI.accept(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
      queryClient.invalidateQueries({ queryKey: ['friends', 'list'] })
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (friendshipId: number) => friendshipAPI.reject(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] })
    },
    onError: (error: any) => {
      handleApiError(error, showError)
    },
  })

  const getUserName = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user.email
  }

  return (
    <div className="px-4 sm:px-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-main mb-2">{t('social.title')}</h1>
        <p className="text-sm sm:text-base text-text-secondary">{t('social.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-border-soft">
        <button
          onClick={() => setActiveTab('search')}
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
          onClick={() => setActiveTab('friends')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'friends'
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-main'
          }`}
        >
          {t('social.friends')} ({friends.length})
          {activeTab === 'friends' && (
            <motion.div
              layoutId="activeTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'requests'
              ? 'text-primary'
              : 'text-text-secondary hover:text-text-main'
          }`}
        >
          {t('social.requests')}
          {pendingRequests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-secondary-light text-text-on-light">
              {pendingRequests.length}
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

      {/* Search Tab */}
      {activeTab === 'search' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('social.searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 rounded-lg border border-border-soft bg-background text-text-main focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              />
            </div>
            <Button
              onClick={() => setShowAddFriendModal(true)}
              className="flex items-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {t('social.inviteByEmail')}
            </Button>
          </div>

          {isSearching ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : searchQuery.length > 0 && searchResults.length === 0 ? (
            <Card className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
              <p className="text-text-secondary">{t('social.noResults')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults.map((user: any) => (
                <Card key={user.id} className="p-4">
                  <div className="flex items-center space-x-4">
                    <Avatar
                      src={user.profile_picture}
                      name={getUserName(user)}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-main truncate">
                        {getUserName(user)}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">{user.email}</p>
                    </div>
                    <Button
                      onClick={() => sendRequestMutation.mutate(user.id)}
                      disabled={sendRequestMutation.isPending}
                      className="flex-shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Friends Tab */}
      {activeTab === 'friends' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isLoadingFriends ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : friends.length === 0 ? (
            <Card className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
              <p className="text-text-secondary">{t('social.noFriends')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.map((friend: any) => (
                <Card key={friend.id} className="p-4">
                  <div className="flex items-center space-x-4">
                    <Avatar
                      src={friend.profile_picture}
                      name={getUserName(friend)}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-text-main truncate">
                        {getUserName(friend)}
                      </h3>
                      <p className="text-sm text-text-secondary truncate">{friend.email}</p>
                    </div>
                    <Button
                      onClick={() => navigate('/messages', { state: { userId: friend.id } })}
                      variant="secondary"
                      className="flex-shrink-0"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isLoadingRequests ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-text-secondary" />
              <p className="text-text-secondary">{t('social.noRequests')}</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request: any) => (
                <Card key={request.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar
                        src={request.requester?.profile_picture}
                        name={getUserName(request.requester)}
                        size="lg"
                      />
                      <div>
                        <h3 className="font-semibold text-text-main">
                          {getUserName(request.requester)}
                        </h3>
                        <p className="text-sm text-text-secondary">{request.requester?.email}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => acceptMutation.mutate(request.id)}
                        disabled={acceptMutation.isPending}
                        className="bg-primary text-white"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => rejectMutation.mutate(request.id)}
                        disabled={rejectMutation.isPending}
                        variant="secondary"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      )}

      <AddFriendModal
        isOpen={showAddFriendModal}
        onClose={() => setShowAddFriendModal(false)}
      />

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

