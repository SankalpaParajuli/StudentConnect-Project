import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children, title, showSearch = false, onSearch }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, getMe, token } = useAuthStore();
  const { connectSocket, disconnectSocket } = useChatStore();
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize auth and dark mode
  useEffect(() => {
    const initializeApp = async () => {
      // Check for dark mode preference
      const isDark = localStorage.getItem('darkMode') === 'true';
      setDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      }

      // Verify authentication
      if (!isAuthenticated) {
        const result = await getMe();
        if (!result.success) {
          navigate('/login');
          return;
        }
      }

      setIsLoading(false);
    };

    initializeApp();
  }, [isAuthenticated, getMe, navigate]);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket(token);

      return () => {
        disconnectSocket();
      };
    }
  }, [isAuthenticated, token, connectSocket, disconnectSocket]);

  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin mb-4">
            <div className="w-12 h-12 border-4 border-[#4F7C82] border-t-transparent rounded-full" />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
        {/* Sidebar */}
        <Sidebar darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Topbar */}
          <Topbar
            title={title}
            onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            darkMode={darkMode}
            onToggleDarkMode={handleToggleDarkMode}
            showSearch={showSearch}
            onSearch={onSearch}
          />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;
