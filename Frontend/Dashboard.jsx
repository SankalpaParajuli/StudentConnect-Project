import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  BookOpen,
  Users,
  Video,
  Dices,
  User,
  Users2,
  Share2,
  Award,
  Flame,
  AlertCircle,
  Clock,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button, Avatar, Badge, Skeleton } from '../components/ui';
import api from '../api/axios';
import { formatDate } from '../lib/utils';

// Loading skeleton for stats cards
const StatsCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-3">
    <Skeleton height={24} width={40} />
    <Skeleton height={32} width={60} />
    <Skeleton height={18} width={80} />
  </div>
);

// Loading skeleton for announcement
const AnnouncementSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-3">
    <Skeleton height={20} width={150} />
    <Skeleton height={60} />
    <Skeleton height={16} width={100} />
  </div>
);

// Loading skeleton for user card
const UserCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-shrink-0 w-48 space-y-3">
    <Skeleton variant="circular" width={48} height={48} />
    <Skeleton height={16} width={120} />
    <Skeleton height={14} width={100} />
    <Skeleton height={32} />
  </div>
);

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, color, bgColor }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  </div>
);

// Announcement Card Component
const AnnouncementCard = ({ announcement }) => {
  const isPriority = announcement.priority === 'urgent';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 hover:shadow-lg transition-shadow border-l-4 border-l-[#4F7C82]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {isPriority && (
            <Badge variant="danger" size="sm">
              URGENT
            </Badge>
          )}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatDate(announcement.createdAt)}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {announcement.title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
        {announcement.content}
      </p>
      {announcement.content && announcement.content.length > 150 && (
        <button className="mt-3 text-sm font-semibold text-[#4F7C82] hover:text-[#0B2E33] dark:hover:text-[#B8E3E9] transition-colors inline-flex items-center gap-1">
          Read More <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// Quick Action Card Component
const QuickActionCard = ({ icon: Icon, label, description, color, bgColor, onClick }) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-gray-800 rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1 text-left group"
  >
    <div className={`p-3 rounded-lg ${bgColor} w-fit mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className={`h-6 w-6 ${color}`} />
    </div>
    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-[#4F7C82] dark:group-hover:text-[#B8E3E9] transition-colors">
      {label}
    </h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
  </button>
);

// Friend Suggestion Card Component
const FriendCard = ({ user, onAdd }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-shrink-0 w-48 hover:shadow-lg transition-shadow">
    <div className="flex flex-col items-center text-center mb-3">
      <Avatar name={user.name} size="lg" className="mb-3" />
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
        {user.name}
      </h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
        {user.course}
      </p>
      {user.year && (
        <Badge variant="info" size="sm" className="mt-2">
          {user.year}
        </Badge>
      )}
    </div>
    <Button
      size="sm"
      className="w-full"
      onClick={() => onAdd(user.id)}
    >
      <UserPlus className="h-4 w-4" />
      Add Friend
    </Button>
  </div>
);

// Notification Item Component
const NotificationItem = ({ notification }) => {
  const getIcon = (type) => {
    const iconProps = 'h-5 w-5';
    switch (type) {
      case 'message':
        return <MessageCircle className={iconProps} />;
      case 'friend':
        return <Users2 className={iconProps} />;
      case 'announcement':
        return <AlertCircle className={iconProps} />;
      default:
        return <Clock className={iconProps} />;
    }
  };

  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
      <div className="p-2 bg-[#B8E3E9]/20 dark:bg-[#4F7C82]/20 rounded-lg flex-shrink-0 text-[#4F7C82]">
        {getIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 dark:text-white">
          {notification.message}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {formatDate(notification.createdAt)}
        </p>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState({
    friends: 0,
    resourcesShared: 0,
    badgesEarned: 0,
    dayStreak: 0,
  });
  const [announcements, setAnnouncements] = useState([]);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch announcements (accessible to all authenticated users)
        const announcementsResponse = await api.get('/admin/announcements');
        setAnnouncements(announcementsResponse.data.announcements || []);

        // Fetch friend suggestions (users not yet friends)
        const suggestionsResponse = await api.get('/users?search=a&limit=5');
        setFriendSuggestions(
          (suggestionsResponse.data.users || []).filter(u => u.id !== user?.id)
        );

        // Fetch notifications
        const notificationsResponse = await api.get('/notifications?page=1&limit=5');
        setNotifications(notificationsResponse.data.notifications || []);

        // Set stats (these would normally come from the API)
        setStats({
          friends: user?.friendsCount || 0,
          resourcesShared: user?.resourcesCount || 0,
          badgesEarned: user?.badgesCount || 0,
          dayStreak: user?.dayStreak || 0,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isAuthenticated, navigate, user]);

  const handleQuickAction = (action) => {
    const routes = {
      chat: '/chat',
      library: '/library',
      tutors: '/tutors',
      rooms: '/rooms',
      random: '/random-chat',
      profile: '/profile',
    };
    navigate(routes[action]);
  };

  const handleAddFriend = async (userId) => {
    try {
      await api.post(`/users/${userId}/add-friend`);
      toast.success('Friend request sent!');
      setFriendSuggestions(
        friendSuggestions.filter((u) => u.id !== userId)
      );
    } catch (error) {
      toast.error('Failed to send friend request');
    }
  };

  // Format today's date
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#4F7C82] to-[#0B2E33] text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                Welcome back, {user?.name?.split(' ')[0]}!
              </h1>
              <p className="text-[#B8E3E9] text-lg">
                {dateString}
              </p>
            </div>
            <Avatar name={user?.name} size="xl" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Stats Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Your Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              <>
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
              </>
            ) : (
              <>
                <StatsCard
                  icon={Users2}
                  label="Friends"
                  value={stats.friends}
                  color="text-[#4D96FF]"
                  bgColor="bg-blue-100 dark:bg-blue-900/30"
                />
                <StatsCard
                  icon={Share2}
                  label="Resources Shared"
                  value={stats.resourcesShared}
                  color="text-[#6BCB77]"
                  bgColor="bg-green-100 dark:bg-green-900/30"
                />
                <StatsCard
                  icon={Award}
                  label="Badges Earned"
                  value={stats.badgesEarned}
                  color="text-[#FFD93D]"
                  bgColor="bg-yellow-100 dark:bg-yellow-900/30"
                />
                <StatsCard
                  icon={Flame}
                  label="Day Streak"
                  value={stats.dayStreak}
                  color="text-[#FF6B6B]"
                  bgColor="bg-red-100 dark:bg-red-900/30"
                />
              </>
            )}
          </div>
        </section>

        {/* Announcements Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Latest Announcements
            </h2>
            {announcements.length > 3 && (
              <button className="text-sm font-semibold text-[#4F7C82] hover:text-[#0B2E33] dark:hover:text-[#B8E3E9] transition-colors">
                View all
              </button>
            )}
          </div>
          {loading ? (
            <div className="space-y-4">
              <AnnouncementSkeleton />
              <AnnouncementSkeleton />
            </div>
          ) : announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.slice(0, 3).map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No announcements at the moment. Check back later!
              </p>
            </div>
          )}
        </section>

        {/* Quick Actions Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <QuickActionCard
              icon={MessageCircle}
              label="Start Chat"
              description="Connect with friends"
              color="text-[#4D96FF]"
              bgColor="bg-blue-100 dark:bg-blue-900/30"
              onClick={() => handleQuickAction('chat')}
            />
            <QuickActionCard
              icon={BookOpen}
              label="Browse Library"
              description="Explore shared resources"
              color="text-[#6BCB77]"
              bgColor="bg-green-100 dark:bg-green-900/30"
              onClick={() => handleQuickAction('library')}
            />
            <QuickActionCard
              icon={Users}
              label="Find Tutors"
              description="Get academic help"
              color="text-[#9B59B6]"
              bgColor="bg-purple-100 dark:bg-purple-900/30"
              onClick={() => handleQuickAction('tutors')}
            />
            <QuickActionCard
              icon={MessageCircle}
              label="Join Room"
              description="Video study sessions"
              color="text-[#FF6B6B]"
              bgColor="bg-red-100 dark:bg-red-900/30"
              onClick={() => handleQuickAction('rooms')}
            />
            <QuickActionCard
              icon={Dices}
              label="Random Chat"
              description="Meet new people"
              color="text-[#F39C12]"
              bgColor="bg-orange-100 dark:bg-orange-900/30"
              onClick={() => handleQuickAction('random')}
            />
            <QuickActionCard
              icon={User}
              label="My Profile"
              description="View your profile"
              color="text-[#4F7C82]"
              bgColor="bg-[#B8E3E9]/20 dark:bg-[#4F7C82]/20"
              onClick={() => handleQuickAction('profile')}
            />
          </div>
        </section>

        {/* Friend Suggestions Section */}
        {friendSuggestions.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              People You May Know
            </h2>
            <div className="overflow-x-auto pb-4 scrollbar-hide">
              <div className="flex gap-6 min-w-min">
                {loading ? (
                  <>
                    <UserCardSkeleton />
                    <UserCardSkeleton />
                    <UserCardSkeleton />
                  </>
                ) : (
                  friendSuggestions.map((user) => (
                    <FriendCard
                      key={user.id}
                      user={user}
                      onAdd={handleAddFriend}
                    />
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* Recent Notifications Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Recent Notifications
          </h2>
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 space-y-4">
              <Skeleton height={60} />
              <Skeleton height={60} />
              <Skeleton height={60} />
            </div>
          ) : notifications.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
              {notifications.length >= 5 && (
                <button className="mt-4 w-full py-2 text-center text-sm font-semibold text-[#4F7C82] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-lg">
                  View all notifications
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No notifications yet. You're all caught up!
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Custom scrollbar hiding for overflow */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
