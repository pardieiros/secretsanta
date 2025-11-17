import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { groupAPI } from '../lib/api'
import Button from '../components/Button'
import Card from '../components/Card'
import emptyState from '../assets/img/image.png'

export default function Dashboard() {
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupAPI.list(),
  })

  // Handle paginated response
  const groups = groupsData?.results || groupsData || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-text-main">My Groups</h1>
        <Link to="/groups/new">
          <Button>Create New Group</Button>
        </Link>
      </div>

      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <img src={emptyState} alt="No groups" className="h-64 mx-auto mb-6 opacity-50" />
          <h2 className="text-2xl font-bold text-text-main mb-2">No groups yet</h2>
          <p className="text-text-secondary mb-6">Create your first Secret Santa group to get started!</p>
          <Link to="/groups/new">
            <Button>Create Group</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group: any) => (
            <Link key={group.id} to={`/groups/${group.id}`}>
              <Card className="hover:shadow-xl transition-shadow cursor-pointer h-full">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-text-main">{group.name}</h3>
                  {group.is_owner && (
                    <span className="badge-secondary text-xs">Owner</span>
                  )}
                </div>
                
                {group.description && (
                  <p className="text-text-secondary text-sm mb-4 line-clamp-2">
                    {group.description}
                  </p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Members:</span>
                    <span className="font-medium text-text-main">
                      {group.member_count} / {group.min_participants}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Draw Date:</span>
                    <span className="font-medium text-text-main">
                      {format(new Date(group.draw_datetime), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Exchange:</span>
                    <span className="font-medium text-text-main">
                      {format(new Date(group.exchange_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border-soft">
                  {group.is_drawn ? (
                    <span className="badge-success">Draw Completed</span>
                  ) : group.can_draw ? (
                    <span className="badge-warning">Ready to Draw</span>
                  ) : (
                    <span className="badge bg-gray-400 text-white">Pending</span>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

