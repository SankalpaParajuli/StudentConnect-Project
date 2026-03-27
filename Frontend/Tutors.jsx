import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  BookOpen,
  Clock,
  MessageSquare,
  Send,
  Award,
  Plus,
  X,
  ChevronRight,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button, Avatar, Badge, Input, Modal } from '../components/ui';
import api from '../api/axios';
import { formatDate } from '../lib/utils';

// Tab Navigation
const TabNav = ({ activeTab, onTabChange }) => (
  <div className="border-b border-gray-200 dark:border-gray-700">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex gap-8">
        {['find', 'sessions', 'become'].map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={cn(
              'py-4 px-1 font-medium text-sm border-b-2 transition-colors',
              activeTab === tab
                ? 'border-[#4F7C82] text-[#4F7C82] dark:text-[#B8E3E9]'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            )}
          >
            {tab === 'find' && 'Find Tutors'}
            {tab === 'sessions' && 'My Sessions'}
            {tab === 'become' && 'Become a Tutor'}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const cn = (...classes) => classes.filter(Boolean).join(' ');

// Tutor Card
const TutorCard = ({ tutor, onRequest }) => {
  const rating = tutor.rating || 4.8;
  const sessionsCount = tutor.sessionsCompleted || 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-4 mb-4">
        <Avatar name={tutor.name} size="lg" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {tutor.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {tutor.expertise || 'Expert Tutor'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-4 w-4',
                    i < Math.floor(rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {rating} ({sessionsCount} sessions)
            </span>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">
          Subjects
        </p>
        <div className="flex flex-wrap gap-2">
          {(tutor.subjects || ['Mathematics', 'Science']).slice(0, 4).map(
            (subject, i) => (
              <Badge key={i} variant="info" size="sm">
                {subject}
              </Badge>
            )
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <p className="font-medium text-gray-900 dark:text-white">
            ${tutor.hourlyRate || '25'}/hour
          </p>
        </div>
        <Button
          onClick={() => onRequest(tutor)}
          className="w-full"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Request Session
        </Button>
      </div>
    </div>
  );
};

// Session Card
const SessionCard = ({ session, onAction }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'accepted':
        return 'info';
      case 'completed':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const canRate = session.status === 'completed' && !session.rated;
  const isPending = session.status === 'pending';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={session.tutor?.name || session.student?.name}
            size="lg"
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {session.tutor?.name || session.student?.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {session.subject}
            </p>
          </div>
        </div>
        <Badge variant={getStatusColor(session.status)}>
          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
        </Badge>
      </div>

      <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{formatDate(session.scheduledAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span>{session.duration || 60} minutes</span>
        </div>
      </div>

      {session.notes && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
          {session.notes}
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        {isPending && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAction('cancel', session.id)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => onAction('message', session.id)}
              className="flex-1"
            >
              Message
            </Button>
          </>
        )}

        {session.status === 'accepted' && (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAction('reschedule', session.id)}
              className="flex-1"
            >
              Reschedule
            </Button>
            <Button
              size="sm"
              onClick={() => onAction('join', session.id)}
              className="flex-1"
            >
              Join Session
            </Button>
          </>
        )}

        {canRate && (
          <Button
            size="sm"
            onClick={() => onAction('rate', session.id)}
            className="flex-1"
          >
            <Star className="h-4 w-4 mr-2" />
            Rate Session
          </Button>
        )}
      </div>
    </div>
  );
};

// Request Session Modal
const RequestSessionModal = ({ isOpen, onClose, tutor, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    subject: '',
    duration: 60,
    scheduledAt: '',
    notes: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(tutor.id, formData);
    setFormData({
      subject: '',
      duration: 60,
      scheduledAt: '',
      notes: '',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request Session with ${tutor?.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subject
          </label>
          <Input
            type="text"
            placeholder="e.g., Calculus, Biology"
            value={formData.subject}
            onChange={(e) =>
              setFormData({ ...formData, subject: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Duration (minutes)
          </label>
          <select
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
          >
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="90">1.5 hours</option>
            <option value="120">2 hours</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Preferred Date & Time
          </label>
          <Input
            type="datetime-local"
            value={formData.scheduledAt}
            onChange={(e) =>
              setFormData({ ...formData, scheduledAt: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Notes
          </label>
          <textarea
            placeholder="Tell the tutor about your learning goals..."
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
          />
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
            disabled={
              !formData.subject.trim() ||
              !formData.scheduledAt ||
              isLoading
            }
            className="flex-1"
          >
            Send Request
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Rate Session Modal
const RateSessionModal = ({ isOpen, onClose, session, onSubmit, isLoading }) => {
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(session.id, rating, review);
    setRating(5);
    setReview('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rate Your Session"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Rating
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-2 transition"
              >
                <Star
                  className={cn(
                    'h-8 w-8',
                    star <= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300 dark:text-gray-600'
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Review
          </label>
          <textarea
            placeholder="Share your feedback about the session..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
          />
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
            disabled={isLoading}
            className="flex-1"
          >
            Submit Review
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Become Tutor Form
const BecomeTutorForm = ({ onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    subjects: '',
    grades: '',
    experience: '',
    bio: '',
    hourlyRate: '25',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      subjects: formData.subjects.split(',').map((s) => s.trim()),
    });
    setFormData({
      subjects: '',
      grades: '',
      experience: '',
      bio: '',
      hourlyRate: '25',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Become a Tutor
      </h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subjects (comma-separated)
          </label>
          <Input
            type="text"
            placeholder="e.g., Mathematics, Physics, Chemistry"
            value={formData.subjects}
            onChange={(e) =>
              setFormData({ ...formData, subjects: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Grade Levels
          </label>
          <Input
            type="text"
            placeholder="e.g., 9-12, College"
            value={formData.grades}
            onChange={(e) =>
              setFormData({ ...formData, grades: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Teaching Experience (years)
          </label>
          <Input
            type="number"
            placeholder="e.g., 2"
            value={formData.experience}
            onChange={(e) =>
              setFormData({ ...formData, experience: e.target.value })
            }
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio / About You
          </label>
          <textarea
            placeholder="Tell students about your teaching style and expertise..."
            value={formData.bio}
            onChange={(e) =>
              setFormData({ ...formData, bio: e.target.value })
            }
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Hourly Rate ($)
          </label>
          <Input
            type="number"
            placeholder="25"
            value={formData.hourlyRate}
            onChange={(e) =>
              setFormData({ ...formData, hourlyRate: e.target.value })
            }
            min="10"
            step="5"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={
            !formData.subjects.trim() ||
            !formData.grades.trim() ||
            !formData.experience ||
            !formData.bio.trim() ||
            isLoading
          }
          className="w-full"
        >
          <Award className="h-4 w-4 mr-2" />
          Apply to Become Tutor
        </Button>
      </div>
    </form>
  );
};

const Tutors = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('find');
  const [tutors, setTutors] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (activeTab === 'find') {
      fetchTutors();
    } else if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [isAuthenticated, activeTab, navigate]);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tutors');
      setTutors(response.data.tutors || []);
    } catch (error) {
      console.error('Failed to fetch tutors:', error);
      toast.error('Failed to load tutors');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tutors/sessions');
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSession = async (tutorId, formData) => {
    try {
      setIsSubmitting(true);
      const response = await api.post('/tutors/sessions', {
        tutorId,
        ...formData,
      });

      toast.success('Session request sent!');
      setRequestModalOpen(false);
      setSelectedTutor(null);
      setActiveTab('sessions');
      fetchSessions();
    } catch (error) {
      console.error('Failed to request session:', error);
      toast.error(error.response?.data?.message || 'Failed to request session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSessionAction = async (action, sessionId) => {
    try {
      switch (action) {
        case 'cancel':
          await api.put(`/tutors/sessions/${sessionId}/respond`, {
            status: 'cancelled',
          });
          toast.success('Session cancelled');
          fetchSessions();
          break;

        case 'rate':
          const session = sessions.find((s) => s.id === sessionId);
          setSelectedSession(session);
          setRateModalOpen(true);
          break;

        default:
          toast.info('This action is not yet implemented');
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
      toast.error('Failed to perform action');
    }
  };

  const handleRateSession = async (sessionId, rating, review) => {
    try {
      setIsSubmitting(true);
      await api.put(`/tutors/sessions/${sessionId}/complete`, {
        rating,
        review,
      });

      toast.success('Thank you for your review!');
      setRateModalOpen(false);
      setSelectedSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Failed to rate session:', error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBecomeTutor = async (formData) => {
    try {
      setIsSubmitting(true);
      await api.post('/tutors/apply', formData);
      toast.success('Application submitted! We\'ll review it soon.');
      setActiveTab('find');
    } catch (error) {
      console.error('Failed to submit application:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Tutoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Connect with expert tutors or share your knowledge
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Find Tutors Tab */}
        {activeTab === 'find' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Available Tutors
              </h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse"
                  >
                    <div className="h-12 w-12 bg-gray-300 dark:bg-gray-700 rounded-full mb-4" />
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-4" />
                    <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : tutors.length > 0 ? (
              (() => {
                const filtered = tutors.filter((tutor) => {
                  const q = searchQuery.toLowerCase();
                  if (!q) return true;
                  const nameMatch = (tutor.name || '').toLowerCase().includes(q);
                  const subjectMatch = (tutor.subjects || []).some((s) =>
                    s.toLowerCase().includes(q)
                  );
                  const expertiseMatch = (tutor.expertise || '').toLowerCase().includes(q);
                  return nameMatch || subjectMatch || expertiseMatch;
                });
                return filtered.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((tutor) => (
                      <TutorCard
                        key={tutor.id}
                        tutor={tutor}
                        onRequest={(t) => {
                          setSelectedTutor(t);
                          setRequestModalOpen(true);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
                    <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      No tutors found
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Try a different name or subject
                    </p>
                  </div>
                );
              })()
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No tutors available
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Check back soon for available tutors
                </p>
              </div>
            )}
          </div>
        )}

        {/* My Sessions Tab */}
        {activeTab === 'sessions' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
              My Sessions
            </h2>

            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse"
                  >
                    <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-4" />
                    <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
                  </div>
                ))}
              </div>
            ) : sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onAction={handleSessionAction}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
                <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No sessions yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Request a session with a tutor to get started
                </p>
                <Button onClick={() => setActiveTab('find')}>
                  <ChevronRight className="h-4 w-4 mr-2" />
                  Find Tutors
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Become Tutor Tab */}
        {activeTab === 'become' && (
          <div className="py-8">
            <BecomeTutorForm
              onSubmit={handleBecomeTutor}
              isLoading={isSubmitting}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTutor && (
        <RequestSessionModal
          isOpen={requestModalOpen}
          onClose={() => {
            setRequestModalOpen(false);
            setSelectedTutor(null);
          }}
          tutor={selectedTutor}
          onSubmit={handleRequestSession}
          isLoading={isSubmitting}
        />
      )}

      {selectedSession && (
        <RateSessionModal
          isOpen={rateModalOpen}
          onClose={() => {
            setRateModalOpen(false);
            setSelectedSession(null);
          }}
          session={selectedSession}
          onSubmit={handleRateSession}
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};

export default Tutors;
