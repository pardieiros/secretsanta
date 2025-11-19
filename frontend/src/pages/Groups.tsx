import { useQuery } from '@tanstack/react-query'
import { groupAPI } from '../lib/api'
import GroupsHeader from '../components/pages/groups/GroupsHeader'
import GroupsLoading from '../components/pages/groups/GroupsLoading'
import GroupsEmptyState from '../components/pages/groups/GroupsEmptyState'
import GroupsGrid from '../components/pages/groups/GroupsGrid'

export default function Groups() {
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.list(),
  })

  // Handle paginated response
  const groups = groupsData?.results || groupsData || []

  if (isLoading) {
    return <GroupsLoading />
  }

  return (
    <div className="px-4 sm:px-6">
      <GroupsHeader />

      {groups.length === 0 ? <GroupsEmptyState /> : <GroupsGrid groups={groups} />}
    </div>
  )
}

