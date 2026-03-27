import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Users,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Megaphone,
  Search,
  Filter,
  Ban,
  Check,
  X,
  Trash2,
  Eye,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button, Avatar, Badge, Input, Modal } from '../components/ui';
import api from '../api/axios';
import { formatDate } from '../lib/utils';

// Stats Card
const StatsCard = ({ icon: Icon, label, value, color, bgColor }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
          {label}
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
          {value}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`h-6 w-6 ${color}`} />
      </div>
    </div>
  </div>
);

// Tab Navigation
const TabNav = ({ activeTab, onTabChange }) => (
  <div className="border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 bg-white dark:bg-gray-800">
    <div className="flex gap-8">
      {['users', 'approvals', 'content', 'reports', 'announcements'].map(
        (tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`py-4 px-1 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-[#4F7C82] text-[#4F7C82]'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'users' && 'Users'}
            {tab === 'approvals' && 'Approvals'}
            {tab === 'content' && 'Content'}
            {tab === 'reports' && 'Reports'}
            {tab === 'announcements' && 'Announcements'}
          </button>
        )
      )}
    </div>
  </div>
);

// Users Tab
const UsersTab = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      setUsers(response.data.users || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId, action) => {
    try {
      if (action === 'approve') {
        await api.put(`/admin/users/${userId}/approve`);
        toast.success('User approved');
      } else if (action === 'ban') {
        await api.put(`/admin/users/${userId}/ban`);
        toast.success('User banned');
      } else if (action === 'unban') {
        await api.put(`/admin/users/${userId}/unban`);
        toast.success('User unbanned');
      }
      fetchUsers();
    } catch (error) {
      console.error('Failed to perform action:', error);
      toast.error('Failed to perform action');
    }
  };

  // Derive status from DB fields since there's no status column
  const getUserStatus = (u) => {
    if (u.isBanned) return 'banned';
    if (!u.isApproved) return 'pending';
    return 'active';
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    if (filter === 'all') return matchesSearch;
    return matchesSearch && getUserStatus(u) === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          Loading users...
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-6 py-4 flex items-center gap-3">
                    <Avatar name={user.name} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Joined {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {user.course || 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={
                        getUserStatus(user) === 'active'
                          ? 'success'
                          : getUserStatus(user) === 'banned'
                            ? 'danger'
                            : 'warning'
                      }
                      size="sm"
                    >
                      {getUserStatus(user)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    {getUserStatus(user) === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleAction(user.id, 'approve')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    {getUserStatus(user) === 'active' && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAction(user.id, 'ban')}
                      >
                        <Ban className="h-4 w-4" />
                      </Button>
                    )}
                    {getUserStatus(user) === 'banned' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAction(user.id, 'unban')}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No users found
        </div>
      )}
    </div>
  );
};

// Approvals Tab — shows pending resources and pending user accounts
const ApprovalsTab = () => {
  const [pendingResources, setPendingResources] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [resourcesRes, usersRes] = await Promise.all([
        api.get('/admin/pending'),
        api.get('/admin/users', { params: { isApproved: 'false' } }),
      ]);
      setPendingResources(resourcesRes.data.resources || []);
      setPendingUsers(usersRes.data.users || []);
    } catch (error) {
      console.error('Failed to fetch pending items:', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveResource = async (id) => {
    try {
      await api.put(`/admin/pending/${id}/approve`);
      toast.success('Resource approved');
      fetchAll();
    } catch (error) {
      toast.error('Failed to approve resource');
    }
  };

  const handleRejectResource = async (id) => {
    try {
      await api.put(`/admin/pending/${id}/reject`);
      toast.success('Resource rejected');
      fetchAll();
    } catch (error) {
      toast.error('Failed to reject resource');
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/approve`);
      toast.success('User approved');
      fetchAll();
    } catch (error) {
      toast.error('Failed to approve user');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        Loading pending approvals...
      </div>
    );
  }

  const hasNothing = pendingResources.length === 0 && pendingUsers.length === 0;

  return (
    <div className="space-y-8">
      {hasNothing && (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No pending approvals
        </div>
      )}

      {/* Pending User Accounts */}
      {pendingUsers.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Pending User Accounts ({pendingUsers.length})
          </h3>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <div
                key={u.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{u.name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400">Joined {formatDate(u.createdAt)}</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => handleApproveUser(u.id)}>
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Resources */}
      {pendingResources.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Pending Resources ({pendingResources.length})
          </h3>
          <div className="space-y-3">
            {pendingResources.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      By {item.uploader?.name} · {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <Badge variant="warning" size="sm">{item.category}</Badge>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {item.description}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApproveResource(item.id)}>
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleRejectResource(item.id)}>
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Content Tab
const ContentTab = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/resources');
      setResources(response.data.resources || []);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;

    try {
      await api.delete(`/admin/resources/${id}`);
      toast.success('Resource deleted');
      fetchResources();
    } catch (error) {
      console.error('Failed to delete resource:', error);
      toast.error('Failed to delete resource');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        Loading resources...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resources.length > 0 ? (
        resources.map((resource) => (
          <div
            key={resource.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 flex items-start justify-between"
          >
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {resource.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                by {resource.uploader?.name}
              </p>
              <div className="flex gap-2 mt-3">
                <Badge variant="info" size="sm">
                  {resource.category}
                </Badge>
                <Badge
                  variant={resource.status === 'approved' ? 'success' : 'warning'}
                  size="sm"
                >
                  {resource.status}
                </Badge>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleDelete(resource.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No resources to manage
        </div>
      )}
    </div>
  );
};

// Reports Tab
const ReportsTab = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/reports');
      setReports(response.data.reports || []);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await api.put(`/admin/reports/${id}/resolve`);
      toast.success('Report resolved');
      fetchReports();
    } catch (error) {
      console.error('Failed to resolve report:', error);
      toast.error('Failed to resolve report');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        Loading reports...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.length > 0 ? (
        reports.map((report) => (
          <div
            key={report.id}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Avatar name={report.reporter?.name} size="sm" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {report.reporter?.name} reported{' '}
                      {report.reportedUser?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(report.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              <Badge
                variant={
                  report.status === 'resolved'
                    ? 'success'
                    : report.status === 'pending'
                      ? 'warning'
                      : 'secondary'
                }
                size="sm"
              >
                {report.status}
              </Badge>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reason: {report.reason}
              </p>
              {report.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {report.description}
                </p>
              )}
            </div>

            {report.status !== 'resolved' && (
              <Button
                size="sm"
                onClick={() => handleResolve(report.id)}
              >
                <Check className="h-4 w-4 mr-2" />
                Resolve
              </Button>
            )}
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No reports
        </div>
      )}
    </div>
  );
};

// Announcements Tab
const AnnouncementsTab = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/announcements');
      setAnnouncements(response.data.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/admin/announcements', formData);
      toast.success('Announcement posted!');
      setFormData({ title: '', content: '', priority: 'NORMAL' });
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to post announcement:', error);
      toast.error('Failed to post announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;

    try {
      await api.delete(`/admin/announcements/${id}`);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  return (
    <div className="space-y-8">
      {/* Create Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Create Announcement
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Announcement title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />

          <textarea
            placeholder="Announcement content"
            value={formData.content}
            onChange={(e) =>
              setFormData({ ...formData, content: e.target.value })
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
            required
          />

          <select
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
          >
            <option value="NORMAL">Normal Priority</option>
            <option value="URGENT">Urgent</option>
          </select>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Post Announcement
          </Button>
        </form>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Recent Announcements
        </h3>

        {loading ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            Loading announcements...
          </div>
        ) : announcements.length > 0 ? (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {announcement.title}
                  </h4>
                  {announcement.priority?.toUpperCase() === 'URGENT' && (
                    <Badge variant="danger" size="sm" className="mt-1">
                      URGENT
                    </Badge>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(announcement.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {announcement.content}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                Posted {formatDate(announcement.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No announcements yet
          </div>
        )}
      </div>
    </div>
  );
};

const Admin = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  // Derive active tab from URL — default to 'users' when no ?tab= param
  const activeTab = searchParams.get('tab') || 'users';
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalResources: 0,
    pendingReports: 0,
    activeRooms: 0,
  });
  const [loading, setLoading] = useState(true);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  useEffect(() => {
    // Check if user is admin
    if (!isAuthenticated || user?.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    fetchStats();
  }, [isAuthenticated, user, navigate]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load admin stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage users, approvals, and content
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatsCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            color="text-blue-600"
            bgColor="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatsCard
            icon={AlertCircle}
            label="Pending Approvals"
            value={stats.pendingApprovals}
            color="text-yellow-600"
            bgColor="bg-yellow-100 dark:bg-yellow-900/30"
          />
          <StatsCard
            icon={FileText}
            label="Resources"
            value={stats.totalResources}
            color="text-green-600"
            bgColor="bg-green-100 dark:bg-green-900/30"
          />
          <StatsCard
            icon={AlertTriangle}
            label="Pending Reports"
            value={stats.pendingReports}
            color="text-red-600"
            bgColor="bg-red-100 dark:bg-red-900/30"
          />
          <StatsCard
            icon={Users}
            label="Active Rooms"
            value={stats.activeRooms}
            color="text-purple-600"
            bgColor="bg-purple-100 dark:bg-purple-900/30"
          />
        </div>
      </div>

      {/* Tab Navigation and Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <TabNav activeTab={activeTab} onTabChange={handleTabChange} />

        <div className="mt-8">
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'approvals' && <ApprovalsTab />}
          {activeTab === 'content' && <ContentTab />}
          {activeTab === 'reports' && <ReportsTab />}
          {activeTab === 'announcements' && <AnnouncementsTab />}
        </div>
      </div>
    </div>
  );
};

export default Admin;
