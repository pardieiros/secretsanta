import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { groupAPI, friendshipAPI, messageAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import PushNotificationPromptModal from '../components/PushNotificationPromptModal'
import DashboardHeader from '../components/pages/dashboard/DashboardHeader'
import GroupsWidget from '../components/pages/dashboard/GroupsWidget'
import FriendsWidget from '../components/pages/dashboard/FriendsWidget'
import MessagesWidget from '../components/pages/dashboard/MessagesWidget'

export default function Dashboard() {
  const { user } = useAuth()
  const [showPushPrompt, setShowPushPrompt] = useState(false)

  // Fetch data for widgets
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.list(),
  })

  const { data: friendsData } = useQuery({
    queryKey: ['friends', 'list'],
    queryFn: () => friendshipAPI.getFriends(),
  })

  const { data: conversationsData } = useQuery({
    queryKey: ['messages', 'conversations'],
    queryFn: () => messageAPI.getConversations(),
  })

  // Handle paginated responses
  const groups = groupsData?.results || groupsData || []
  const friends = friendsData?.results || friendsData || []
  const conversations = conversationsData?.results || conversationsData || []

  // Calculate unread messages
  const unreadMessages = conversations.reduce((total: number, conv: any) => {
    return total + (conv.unread_count || 0)
  }, 0)

  const getUserName = (user: any) => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    return user?.email || ''
  }

  // Check if we should show push notification prompt
  useEffect(() => {
    if (user && user.push_notifications_asked === false) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        setShowPushPrompt(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [user])

  return (
    <>
      <PushNotificationPromptModal
        isOpen={showPushPrompt}
        onClose={() => setShowPushPrompt(false)}
      />
      <div className="space-y-6 sm:space-y-8 px-4 sm:px-6">
        <DashboardHeader />

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <GroupsWidget groups={groups} />
          <FriendsWidget friends={friends} getUserName={getUserName} />
          <MessagesWidget 
            conversations={conversations} 
            unreadMessages={unreadMessages}
            getUserName={getUserName}
          />
        </div>
      </div>
    </>
  )
}
