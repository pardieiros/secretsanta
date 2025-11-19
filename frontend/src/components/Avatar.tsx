import { useState } from 'react'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false)
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const showFallback = !src || imageError

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/30 ${className}`}
    >
      {!showFallback ? (
        <img 
          src={src} 
          alt={name || 'Avatar'} 
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-semibold">
          {name ? (
            <span>{getInitials(name)}</span>
          ) : (
            <User className={`${size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : size === 'lg' ? 'w-6 h-6' : 'w-8 h-8'} text-primary`} />
          )}
        </div>
      )}
    </div>
  )
}

