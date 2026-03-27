/**
 * Merge class names, filtering out falsy values
 * @param {...any} classes - Classes to merge
 * @returns {string} Merged class name string
 */
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Format date to relative time string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted relative time (e.g., "just now", "5m ago")
 */
export const formatDate = (date) => {
  if (!date) return '';

  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'just now';
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Format as "Mar 15" or "Mar 15, 2025"
  const options = { month: 'short', day: 'numeric' };
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (!isThisYear) {
    options.year = 'numeric';
  }

  return d.toLocaleDateString('en-US', options);
};

/**
 * Format duration in minutes to human readable string
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration (e.g., "1h 30m")
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
};

/**
 * Get initials from a name
 * @param {string} name - Full name
 * @returns {string} Initials (e.g., "SP" from "Sankalpa Parajuli")
 */
export const getInitials = (name) => {
  if (!name) return '?';

  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';

  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || '?';
};

/**
 * Get a deterministic avatar color based on name
 * @param {string} name - Name to hash
 * @returns {string} Hex color code
 */
export const getAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', // red
    '#4D96FF', // blue
    '#6BCB77', // green
    '#FFD93D', // yellow
    '#9B59B6', // purple
    '#F39C12', // orange
    '#FF6B9D', // pink
    '#00BCD4', // cyan
    '#FF9800', // orange
    '#009688', // teal
  ];

  if (!name) return colors[0];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Truncate string with ellipsis
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated string
 */
export const truncate = (str, length = 50) => {
  if (!str) return '';
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
};

/**
 * Format time to HH:MM format
 * @param {Date|string} date - Date to format
 * @returns {string} Time in HH:MM format
 */
export const formatTime = (date) => {
  if (!date) return '';

  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (date) => {
  if (!date) return false;

  const d = new Date(date);
  const today = new Date();

  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

/**
 * Format date with time for messages
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date with time
 */
export const formatMessageDate = (date) => {
  if (!date) return '';

  if (isToday(date)) {
    return formatTime(date);
  }

  const d = new Date(date);
  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return d.toLocaleDateString('en-US', options);
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
