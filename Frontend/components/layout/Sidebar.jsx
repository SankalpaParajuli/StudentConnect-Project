import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  BookOpen,
  Video,
  GraduationCap,
  Shuffle,
  User,
  Settings,
  Shield,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  FileText,
  Megaphone,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { cn } from '../../lib/utils';
import Badge from '../ui/Badge';

// Student nav items
const studentNavItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Chat', icon: MessageCircle, path: '/chat', unread: true },
  { label: 'Friends', icon: Users, path: '/friends' },
  { label: 'Library', icon: BookOpen, path: '/library' },
  { label: 'Study Rooms', icon: Video, path: '/rooms' },
  { label: 'Video Call', icon: Video, path: '/video-call' },
  { label: 'Tutors', icon: GraduationCap, path: '/tutors' },
  { label: 'Random Chat', icon: Shuffle, path: '/random-chat' },
  { label: 'Profile', icon: User, path: '/profile' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

// Admin-only nav items — use hash fragments so tabs can be differentiated
const adminNavItems = [
  { label: 'Dashboard', icon: Shield, path: '/admin', tab: '' },
  { label: 'Users', icon: Users, path: '/admin', tab: 'users' },
  { label: 'Approvals', icon: CheckCircle, path: '/admin', tab: 'approvals' },
  { label: 'Resources', icon: FileText, path: '/admin', tab: 'content' },
  { label: 'Reports', icon: AlertCircle, path: '/admin', tab: 'reports' },
  { label: 'Announcements', icon: Megaphone, path: '/admin', tab: 'announcements' },
  { label: 'Profile', icon: User, path: '/profile', tab: null },
  { label: 'Settings', icon: Settings, path: '/settings', tab: null },
];

const Sidebar = ({ darkMode, onToggleDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { unreadCounts } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);
  const currentTab = new URLSearchParams(location.search).get('tab') || '';

  // Compute the `to` destination for admin sidebar items
  const getAdminTo = (item) => {
    if (item.tab === null) return item.path;   // Profile, Settings
    if (item.tab === '') return '/admin';       // Dashboard (no tab param)
    return `/admin?tab=${item.tab}`;
  };

  // Check if an admin nav item should be highlighted as active
  const isAdminItemActive = (item) => {
    if (item.tab === null) return location.pathname === item.path;
    if (location.pathname !== '/admin') return false;
    return currentTab === item.tab;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavClick = () => {
    setIsOpen(false);
  };

  // Admins see admin-only items; students see all student items
  const allNavItems = isAdmin ? adminNavItems : studentNavItems;

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 lg:hidden p-2 rounded-lg bg-[#4F7C82] text-white hover:bg-[#0B2E33] transition-colors"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 z-30 lg:z-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4F7C82] rounded-lg flex items-center justify-center text-white font-bold">
              SC
            </div>
            <div className="font-semibold text-gray-900 dark:text-white text-lg">
              StudentConnect
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {allNavItems.map((item) => {
            if (isAdmin) {
              // Admin items use custom active logic based on URL tab param
              const active = isAdminItemActive(item);
              return (
                <NavLink
                  key={item.label}
                  to={getAdminTo(item)}
                  onClick={handleNavClick}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors relative group',
                    active
                      ? 'bg-[#4F7C82] text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              );
            }

            // Student items use NavLink's built-in isActive
            const hasUnread = item.unread && totalUnread > 0;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors relative group',
                    isActive
                      ? 'bg-[#4F7C82] text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )
                }
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {hasUnread && (
                  <Badge variant="danger" size="sm">
                    {totalUnread}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Dark Mode Toggle */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onToggleDarkMode}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {darkMode ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="text-sm font-medium">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="text-sm font-medium">Dark</span>
              </>
            )}
          </button>
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="mb-3 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Logged in as
            </p>
            <p className="font-semibold text-gray-900 dark:text-white truncate">
              {user?.name || 'User'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
