import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Lock,
  Bell,
  Palette,
  Eye,
  Trash2,
  AlertTriangle,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button, Input, Modal } from '../components/ui';
import api from '../api/axios';

// Delete Account Modal
const DeleteAccountModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Account"
      size="md"
    >
      <div className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">
              This action cannot be undone
            </p>
            <p className="text-sm text-red-800 dark:text-red-300 mt-1">
              Deleting your account will permanently remove all your data,
              including messages, resources, and activity history.
            </p>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm text-gray-900 dark:text-white">
              I understand that this will permanently delete my account and all
              associated data
            </span>
          </label>
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
            type="button"
            variant="danger"
            onClick={() => onConfirm()}
            disabled={!confirmed || isLoading}
            className="flex-1"
          >
            Delete Account
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Settings Section Component
const SettingsSection = ({ title, description, children }) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
);

// Toggle Switch Component
const ToggleSwitch = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      enabled
        ? 'bg-[#4F7C82]'
        : 'bg-gray-300 dark:bg-gray-600'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Settings = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    email: '',
    newPassword: '',
    confirmPassword: '',
    currentPassword: '',
    emailNotifications: true,
    pushNotifications: true,
    messageSounds: true,
    theme: 'system',
    fontSize: 'medium',
    whoCanMessage: 'everyone',
    showOnlineStatus: true,
  });

  const [touched, setTouched] = useState({});
  const [saveStatus, setSaveStatus] = useState({
    account: null,
    notifications: null,
    appearance: null,
    privacy: null,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchSettings();
  }, [isAuthenticated, navigate]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/settings');
      const settingsData = response.data.settings || response.data.data || {};

      setSettings((prev) => ({
        ...prev,
        email: user?.email || '',
        emailNotifications: settingsData.emailNotifications !== false,
        pushNotifications: settingsData.pushNotifications !== false,
        messageSounds: settingsData.messageSounds !== false,
        theme: settingsData.theme || 'system',
        fontSize: settingsData.fontSize || 'medium',
        whoCanMessage: settingsData.whoCanMessage || 'everyone',
        showOnlineStatus: settingsData.showOnlineStatus !== false,
      }));
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // Initialize with defaults
      setSettings((prev) => ({
        ...prev,
        email: user?.email || '',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccountSettings = async () => {
    if (settings.newPassword && settings.newPassword !== settings.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setIsSaving(true);
      setSaveStatus((prev) => ({ ...prev, account: 'saving' }));

      const updateData = {};

      if (settings.newPassword) {
        updateData.currentPassword = settings.currentPassword;
        updateData.newPassword = settings.newPassword;
      }

      if (Object.keys(updateData).length > 0) {
        await api.put('/users/settings', updateData);
      }

      setSaveStatus((prev) => ({ ...prev, account: 'success' }));
      toast.success('Account settings saved!');

      // Clear password fields
      setSettings((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, account: null }));
      }, 2000);
    } catch (error) {
      console.error('Failed to save account settings:', error);
      setSaveStatus((prev) => ({ ...prev, account: 'error' }));
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSaving(true);
      setSaveStatus((prev) => ({ ...prev, notifications: 'saving' }));

      await api.put('/users/settings', {
        emailNotifications: settings.emailNotifications,
        pushNotifications: settings.pushNotifications,
        messageSounds: settings.messageSounds,
      });

      setSaveStatus((prev) => ({ ...prev, notifications: 'success' }));
      toast.success('Notification settings saved!');

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, notifications: null }));
      }, 2000);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      setSaveStatus((prev) => ({ ...prev, notifications: 'error' }));
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    try {
      setIsSaving(true);
      setSaveStatus((prev) => ({ ...prev, appearance: 'saving' }));

      await api.put('/users/settings', {
        theme: settings.theme,
        fontSize: settings.fontSize,
      });

      setSaveStatus((prev) => ({ ...prev, appearance: 'success' }));
      toast.success('Appearance settings saved!');

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, appearance: null }));
      }, 2000);
    } catch (error) {
      console.error('Failed to save appearance settings:', error);
      setSaveStatus((prev) => ({ ...prev, appearance: 'error' }));
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    try {
      setIsSaving(true);
      setSaveStatus((prev) => ({ ...prev, privacy: 'saving' }));

      await api.put('/users/settings', {
        whoCanMessage: settings.whoCanMessage,
        showOnlineStatus: settings.showOnlineStatus,
      });

      setSaveStatus((prev) => ({ ...prev, privacy: 'success' }));
      toast.success('Privacy settings saved!');

      setTimeout(() => {
        setSaveStatus((prev) => ({ ...prev, privacy: null }));
      }, 2000);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      setSaveStatus((prev) => ({ ...prev, privacy: 'error' }));
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      await api.delete('/users/account');
      toast.success('Account deleted successfully');
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account and preferences
          </p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        {/* Account Settings */}
        <SettingsSection
          title="Account"
          description="Manage your email and password"
        >
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                Change Password
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your current password"
                  value={settings.currentPassword}
                  onChange={(e) =>
                    setSettings({ ...settings, currentPassword: e.target.value })
                  }
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter new password"
                  value={settings.newPassword}
                  onChange={(e) =>
                    setSettings({ ...settings, newPassword: e.target.value })
                  }
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="Confirm new password"
                  value={settings.confirmPassword}
                  onChange={(e) =>
                    setSettings({ ...settings, confirmPassword: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveAccountSettings}
              disabled={isSaving}
              className="flex-1"
            >
              {saveStatus.account === 'saving' && 'Saving...'}
              {saveStatus.account === 'success' && (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              )}
              {saveStatus.account === 'error' && 'Error - Try Again'}
              {!saveStatus.account && 'Save Changes'}
            </Button>
          </div>
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection
          title="Notifications"
          description="Control how you receive notifications"
        >
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive notifications via email
                </p>
              </div>
              <ToggleSwitch
                enabled={settings.emailNotifications}
                onChange={(val) =>
                  setSettings({ ...settings, emailNotifications: val })
                }
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Push Notifications
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Receive browser notifications
                  </p>
                </div>
                <ToggleSwitch
                  enabled={settings.pushNotifications}
                  onChange={(val) =>
                    setSettings({ ...settings, pushNotifications: val })
                  }
                />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Message Sounds
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Play sound for new messages
                  </p>
                </div>
                <ToggleSwitch
                  enabled={settings.messageSounds}
                  onChange={(val) =>
                    setSettings({ ...settings, messageSounds: val })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveNotifications}
              disabled={isSaving}
              className="flex-1"
            >
              {saveStatus.notifications === 'saving' && 'Saving...'}
              {saveStatus.notifications === 'success' && (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              )}
              {saveStatus.notifications === 'error' && 'Error - Try Again'}
              {!saveStatus.notifications && 'Save Changes'}
            </Button>
          </div>
        </SettingsSection>

        {/* Appearance Settings */}
        <SettingsSection
          title="Appearance"
          description="Customize how the app looks"
        >
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  setSettings({ ...settings, theme: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size
              </label>
              <select
                value={settings.fontSize}
                onChange={(e) =>
                  setSettings({ ...settings, fontSize: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveAppearance}
              disabled={isSaving}
              className="flex-1"
            >
              {saveStatus.appearance === 'saving' && 'Saving...'}
              {saveStatus.appearance === 'success' && (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              )}
              {saveStatus.appearance === 'error' && 'Error - Try Again'}
              {!saveStatus.appearance && 'Save Changes'}
            </Button>
          </div>
        </SettingsSection>

        {/* Privacy Settings */}
        <SettingsSection
          title="Privacy"
          description="Control your privacy and visibility"
        >
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Who Can Message Me
              </label>
              <select
                value={settings.whoCanMessage}
                onChange={(e) =>
                  setSettings({ ...settings, whoCanMessage: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
              >
                <option value="everyone">Everyone</option>
                <option value="friends">Friends Only</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Show Online Status
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Let others see when you're online
                  </p>
                </div>
                <ToggleSwitch
                  enabled={settings.showOnlineStatus}
                  onChange={(val) =>
                    setSettings({ ...settings, showOnlineStatus: val })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSavePrivacy}
              disabled={isSaving}
              className="flex-1"
            >
              {saveStatus.privacy === 'saving' && 'Saving...'}
              {saveStatus.privacy === 'success' && (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              )}
              {saveStatus.privacy === 'error' && 'Error - Try Again'}
              {!saveStatus.privacy && 'Save Changes'}
            </Button>
          </div>
        </SettingsSection>

        {/* Danger Zone */}
        <SettingsSection
          title="Danger Zone"
          description="Irreversible actions"
        >
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">
                  Delete Your Account
                </p>
                <p className="text-sm text-red-800 dark:text-red-300">
                  This will permanently delete all your data
                </p>
              </div>
            </div>
            <Button
              onClick={() => setDeleteModalOpen(true)}
              variant="danger"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </SettingsSection>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default Settings;
