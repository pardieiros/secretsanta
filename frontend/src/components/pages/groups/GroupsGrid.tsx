import GroupCard from './GroupCard'

interface GroupsGridProps {
  groups: Array<{
    id: number
    name: string
    description?: string
    visibility: 'public' | 'private'
    is_owner: boolean
    member_count: number
    min_participants: number
    draw_datetime: string
    exchange_date: string
    is_drawn: boolean
    can_draw: boolean
  }>
}

export default function GroupsGrid({ groups }: GroupsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} />
      ))}
    </div>
  )
}




