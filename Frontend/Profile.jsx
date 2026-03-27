import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Edit,
  Mail,
  BookOpen,
  Users,
  Award,
  Flame,
  Lock,
  Download,
  X,
  Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button, Avatar, Badge, Input, Modal } from '../components/ui';
import api from '../api/axios';
import { getInitials, formatDate } from '../lib/utils';

// Badge Icons
const BadgeIcons = {
  'First Steps': '🎓',
  'Bookworm': '📚',
  'Social Butterfly': '🦋',
  'Helpful Hand': '🤝',
  'Streak Master': '🔥',
  'Video Star': '⭐',
  'Room Creator': '🏠',
  'Top Contributor': '👑',
};

// Badge Card
const BadgeCard = ({ badge, earned }) => {
  return (
    <div
      className={`p-4 rounded-lg text-center transition-transform hover:scale-105 ${
        earned
          ? 'bg-white dark:bg-gray-800 border-2 border-yellow-400'
          : 'bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 opacity-60'
      }`}
    >
      <div className="text-4xl mb-2">
        {earned ? BadgeIcons[badge.name] || '⭐' : <Lock className="h-8 w-8 mx-auto text-gray-400" />}
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
        {badge.name}
      </h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
        {earned ? badge.description : 'Locked'}
      </p>
      {earned && badge.earnedAt && (
        <p className="text-xs text-gray-500">
          {formatDate(badge.earnedAt)}
        </p>
      )}
      {!earned && (
        <p className="text-xs text-gray-500">
          {badge.requirement}
        </p>
      )}
    </div>
  );
};

// Edit Profile Modal
const EditProfileModal = ({ isOpen, onClose, user, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    course: user?.course || '',
    year: user?.year || '',
    avatar: null,
    avatarFile: null,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        course: user.course || '',
        year: user.year || '',
        avatar: user.avatar || null,
        avatarFile: null,
      });
    }
  }, [user, isOpen]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          avatar: reader.result,
          avatarFile: file,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Profile"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center mb-4">
          <Avatar name={formData.name} size="xl" className="mx-auto mb-2" />
          <label className="inline-block cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <span className="text-sm font-medium text-[#4F7C82] hover:text-[#0B2E33] dark:hover:text-[#B8E3E9]">
              Change Avatar
            </span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Name
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            placeholder="Tell us about yourself..."
            value={formData.bio}
            onChange={(e) =>
              setFormData({ ...formData, bio: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Course
          </label>
          <Input
            type="text"
            placeholder="e.g., Computer Science"
            value={formData.course}
            onChange={(e) =>
              setFormData({ ...formData, course: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Year
          </label>
          <select
            value={formData.year}
            onChange={(e) =>
              setFormData({ ...formData, year: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
          >
            <option value="">Select year</option>
            <option value="1st">1st Year</option>
            <option value="2nd">2nd Year</option>
            <option value="3rd">3rd Year</option>
            <option value="4th">4th Year</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!formData.name.trim() || isLoading}
            className="flex-1"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, updateProfile } = useAuthStore();
  const [profileUser, setProfileUser] = useState(null);
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState({
    friends: 0,
    resources: 0,
    badgesEarned: 0,
    streak: 0,
  });
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchProfileData();
  }, [isAuthenticated, navigate]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch user profile
      const userResponse = await api.get(`/users/${authUser?.id}`);
      const userData = userResponse.data.user;
      setProfileUser(userData);

      // Set stats from user data
      setStats({
        friends: userData?.friendsCount || 0,
        resources: (userData?.uploadedResources?.length) || 0,
        badgesEarned: (userData?.badges?.length) || 0,
        streak: userData?.streakDays || 0,
      });

      // Fetch badges
      const badgesResponse = await api.get(`/users/${authUser?.id}/badges`);
      setBadges(badgesResponse.data.badges || []);

      // Fetch QR code
      try {
        const qrResponse = await api.get(`/users/${authUser?.id}/qr`);
        setQrCode(qrResponse.data.qrCode || null);
      } catch (err) {
        console.log('QR code not available');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (formData) => {
    try {
      setIsUpdating(true);

      const updateData = new FormData();
      updateData.append('name', formData.name);
      updateData.append('bio', formData.bio);
      updateData.append('course', formData.course);
      updateData.append('year', formData.year);

      if (formData.avatarFile) {
        updateData.append('avatar', formData.avatarFile);
      }

      const response = await api.put('/users/profile', updateData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = response.data.user;
      setProfileUser(updatedUser);
      updateProfile(updatedUser);
      setEditModalOpen(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadQR = () => {
    if (!qrCode) return;

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `profile-qr-${authUser?.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading profile...</div>
      </div>
    );
  }

  const earnedBadges = (badges || []).filter((b) => b.earned);
  const lockedBadges = (badges || []).filter((b) => !b.earned);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex gap-6">
              <Avatar name={profileUser?.name} size="xl" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {profileUser?.name}
                </h1>
                <div className="flex items-center gap-2 mt-2 text-gray-600 dark:text-gray-400">
                  <Mail className="h-4 w-4" />
                  <span>{profileUser?.email}</span>
                </div>

                {profileUser?.course && (
                  <div className="flex gap-2 mt-4">
                    <Badge variant="info">{profileUser.course}</Badge>
                    {profileUser?.year && (
                      <Badge variant="secondary">{profileUser.year}</Badge>
                    )}
                  </div>
                )}

                {profileUser?.bio && (
                  <p className="text-gray-600 dark:text-gray-400 mt-4 max-w-md">
                    {profileUser.bio}
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={() => setEditModalOpen(true)}
              variant="primary"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Your Stats
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Friends</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.friends}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="h-5 w-5 text-green-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Resources</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.resources}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Badges</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.badgesEarned}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="h-5 w-5 text-red-500" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Streak</p>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.streak}
            </p>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Badges
        </h2>

        {earnedBadges.length > 0 && (
          <div className="mb-12">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Earned
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {earnedBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned={true}
                />
              ))}
            </div>
          </div>
        )}

        {lockedBadges.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Locked
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {lockedBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  earned={false}
                />
              ))}
            </div>
          </div>
        )}

        {badges.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
            <Award className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No badges yet. Keep engaging to earn badges!
            </p>
          </div>
        )}
      </div>

      {/* QR Code Section */}
      {qrCode && (
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Profile QR Code
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center max-w-xs mx-auto">
            <img
              src={qrCode}
              alt="Profile QR Code"
              className="w-full mb-4 rounded"
            />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Share this code so others can quickly access your profile
            </p>
            <Button
              onClick={handleDownloadQR}
              variant="secondary"
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {profileUser && (
        <EditProfileModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          user={profileUser}
          onSubmit={handleUpdateProfile}
          isLoading={isUpdating}
        />
      )}
    </div>
  );
};

export default Profile;
