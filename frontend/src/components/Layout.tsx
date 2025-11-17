import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/img/logo_128.png'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary text-text-on-dark shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center space-x-3">
              <img src={logo} alt="Secret Santa" className="h-10 w-10" />
              <span className="text-xl font-bold">Secret Santa</span>
            </Link>
            
            <nav className="flex items-center space-x-6">
              <Link to="/dashboard" className="hover:opacity-80 transition-opacity">
                Dashboard
              </Link>
              {user && (
                <div className="flex items-center space-x-4">
                  <span className="text-sm">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-light transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

