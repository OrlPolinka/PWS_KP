import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MessageSquare, 
  Newspaper, 
  CreditCard, 
  LogOut,
  User,
  Bell,
  Clock,
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'trainer', 'client'] },
    { path: '/schedule', icon: Calendar, label: 'Расписание', roles: ['admin', 'trainer', 'client'] },
    { path: '/trainers', icon: Users, label: 'Тренеры', roles: ['admin', 'trainer', 'client'] },
    { path: '/styles', icon: User, label: 'Стили танцев', roles: ['admin', 'trainer', 'client'] },
    { path: '/memberships', icon: CreditCard, label: 'Абонементы', roles: ['admin', 'client'] },
    { path: '/membership-extension-requests', icon: Clock, label: 'Запросы на продление', roles: ['admin'] },
    { path: '/bookings', icon: Calendar, label: 'Бронирования', roles: ['client'] },
    { path: '/chat', icon: MessageSquare, label: 'Чат', roles: ['admin', 'trainer', 'client'] },
    { path: '/news', icon: Newspaper, label: 'Новости', roles: ['admin', 'trainer', 'client'] },
    { path: '/recommendations', icon: User, label: 'Рекомендации', roles: ['client'] },
    { path: '/my-profile', icon: User, label: 'Моя страница', roles: ['trainer'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-surface border-b border-surface2">
        <div className="w-full max-w-7xl mx-auto px-4">
          <div className="flex flex-col gap-3 py-3">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <Link to="/dashboard" className="shrink-0 text-primary font-bold text-lg sm:text-xl">
                Dance Studio
              </Link>
              <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                <Link to="/notifications" className="shrink-0" aria-label="Уведомления">
                  <Bell className="text-textSecondary hover:text-text cursor-pointer" />
                </Link>
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="hidden min-w-0 text-right sm:block">
                    <div className="max-w-40 truncate text-sm font-medium">{user.full_name}</div>
                    <div className="text-xs text-textSecondary capitalize">{user.role}</div>
                  </div>
                  {user.photo_url ? (
                    <img src={user.photo_url} alt={user.full_name} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User size={16} className="text-white" />
                    </div>
                  )}
                  <button onClick={logout} aria-label="Выйти" className="shrink-0 rounded-lg p-2 transition-colors hover:bg-surface2">
                    <LogOut size={18} className="text-textSecondary" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs transition-colors sm:px-3 sm:text-sm ${
                      isActive ? 'bg-primary text-white' : 'text-textSecondary hover:text-text hover:bg-surface2'
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      <main className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
