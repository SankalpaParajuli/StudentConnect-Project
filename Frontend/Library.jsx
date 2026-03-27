import React, { useState, useEffect } from 'react';
import {
  Upload,
  Search,
  X,
  Download,
  Star,
  BookOpen,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Avatar, Badge, Button, Input, Modal } from '../components/ui';
import { cn, truncate, formatDate } from '../lib/utils';
import api from '../api/axios';

// Category enum → display label mapping
const CATEGORY_LABELS = {
  NOTES: 'Notes',
  PAST_PAPERS: 'Past Papers',
  ASSIGNMENTS: 'Assignments',
  BOOKS: 'Books',
  VIDEOS: 'Videos',
  OTHER: 'Other',
};

// Category colors mapping (keyed by enum value)
const CATEGORY_COLORS = {
  NOTES: '#FF6B6B',
  PAST_PAPERS: '#4D96FF',
  ASSIGNMENTS: '#6BCB77',
  BOOKS: '#FFD93D',
  VIDEOS: '#9B59B6',
  OTHER: '#95A5A6',
};

const getCategoryLabel = (cat) => CATEGORY_LABELS[cat] || cat || 'Other';
const getCategoryColor = (cat) => CATEGORY_COLORS[cat] || '#95A5A6';

const YEAR_LABELS = { 1: '1st Year', 2: '2nd Year', 3: '3rd Year' };
const getYearLabel = (year) => YEAR_LABELS[year] || (year ? `Year ${year}` : null);

// Resource card component
const ResourceCard = ({ resource, onView, isUploader }) => {
  const categoryColor = getCategoryColor(resource.category);

  return (
    <div
      onClick={() => onView(resource)}
      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer overflow-hidden flex flex-col h-full"
    >
      {/* Color strip */}
      <div className="h-2" style={{ backgroundColor: categoryColor }} />

      <div className="p-4 flex flex-col flex-1">
        {/* Category Badge */}
        <div className="flex items-center justify-between mb-3">
          <Badge className="text-xs" style={{ backgroundColor: categoryColor + '20', color: categoryColor }}>
            {getCategoryLabel(resource.category)}
          </Badge>
          {resource.status && resource.status.toUpperCase() !== 'APPROVED' && (
            <Badge className={`text-xs ${
              resource.status.toUpperCase() === 'PENDING'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {resource.status.charAt(0).toUpperCase() + resource.status.slice(1).toLowerCase()}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {resource.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">
          {resource.description}
        </p>

        {/* Uploader */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
          <Avatar name={resource.uploader?.name || 'User'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {resource.uploader?.name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-500">{formatDate(resource.createdAt)}</p>
          </div>
        </div>

        {/* Rating and Download */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    'h-4 w-4',
                    i < Math.floor(resource.averageRating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-600">
              ({resource.ratingCount || 0})
            </span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Download className="h-4 w-4" />
            <span className="text-xs">{resource.downloads || 0}</span>
          </div>
        </div>

        {/* Tags */}
        {(resource.branch || resource.year) && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {resource.branch && (
              <Badge variant="secondary" className="text-xs">
                {resource.branch}
              </Badge>
            )}
            {resource.year && (
              <Badge variant="secondary" className="text-xs">
                {getYearLabel(resource.year)}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Resource detail modal
const ResourceDetailModal = ({ resource, onClose, onRate, onDownload, isRating }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!resource.fileUrl) {
      toast.error('No file available for download');
      return;
    }
    setIsDownloading(true);
    try {
      // Increment download count on the backend
      if (onDownload) await onDownload(resource.id);
      // Open file in new tab (works for PDFs, images) or trigger download
      const link = document.createElement('a');
      link.href = resource.fileUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // Force download for non-viewable types
      const viewableTypes = ['image/', 'video/', 'application/pdf'];
      const isViewable = viewableTypes.some(t => (resource.fileType || '').startsWith(t));
      if (!isViewable) {
        link.download = resource.title || 'resource';
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started!');
    } catch {
      toast.error('Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmittingRating(true);
    try {
      await onRate(resource.id, rating, comment);
      setRating(0);
      setComment('');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={resource.title} size="lg">
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar name={resource.uploader?.name || 'User'} size="lg" />
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-2">{getCategoryLabel(resource.category)}</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{resource.title}</h2>
            <p className="text-sm text-gray-600">
              By {resource.uploader?.name} on {formatDate(resource.createdAt)}
            </p>
          </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
          <p className="text-gray-700">{resource.description}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-600">Downloads</p>
            <p className="text-xl font-bold text-gray-900">{resource.downloads || 0}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-600">Rating</p>
            <p className="text-xl font-bold text-gray-900">{parseFloat(resource.averageRating || 0).toFixed(1)}</p>
          </div>
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-xs text-gray-600">Reviews</p>
            <p className="text-xl font-bold text-gray-900">{resource.ratingCount || 0}</p>
          </div>
        </div>

        {/* Tags */}
        {(resource.branch || resource.year) && (
          <div className="flex gap-2">
            {resource.branch && (
              <Badge className="bg-blue-100 text-blue-700">{resource.branch}</Badge>
            )}
            {resource.year && (
              <Badge className="bg-green-100 text-green-700">{resource.year}</Badge>
            )}
          </div>
        )}

        {/* Download Button */}
        <Button
          onClick={handleDownload}
          isLoading={isDownloading}
          disabled={isDownloading || !resource.fileUrl}
          className="w-full bg-[#4F7C82] hover:bg-[#0B2E33] text-white"
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Opening...' : 'View / Download'}
        </Button>

        {/* Rating Section */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Rate this resource</h3>
          <div className="space-y-3">
            {/* Star rating */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-2 hover:bg-gray-100 rounded transition"
                >
                  <Star
                    className={cn(
                      'h-6 w-6',
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              placeholder="Add a comment (optional)"
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82] resize-none"
              rows="3"
            />

            {/* Submit button */}
            <Button
              onClick={handleSubmitRating}
              isLoading={isSubmittingRating}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              Submit Review
            </Button>
          </div>
        </div>

        {/* Existing reviews */}
        {resource.reviews && resource.reviews.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Reviews</h3>
            <div className="space-y-3">
              {resource.reviews.map(review => (
                <div key={review.id} className="border-l-2 border-gray-200 pl-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm text-gray-900">{review.user?.name}</p>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3 w-3',
                            i < review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(review.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Upload modal
const UploadModal = ({ isOpen, onClose, onUpload, isUploading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'NOTES',
    branch: 'Computing',
    year: '1st',
    file: null,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!formData.file) {
      toast.error('Please select a file');
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('branch', formData.branch);
    data.append('year', formData.year);
    data.append('file', formData.file);

    const success = await onUpload(data);
    if (success) {
      setFormData({
        title: '',
        description: '',
        category: 'NOTES',
        branch: 'Computing',
        year: '1st',
        file: null,
      });
    }
  };

  const fileName = formData.file?.name;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Resource" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder="Resource title"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            placeholder="Brief description of the resource"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82] resize-none"
            rows="3"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            Category
          </label>
          <select
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
          >
            <option value="NOTES">Notes</option>
            <option value="PAST_PAPERS">Past Papers</option>
            <option value="ASSIGNMENTS">Assignments</option>
            <option value="BOOKS">Books</option>
            <option value="VIDEOS">Videos</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* Branch and Year */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Branch
            </label>
            <select
              value={formData.branch}
              onChange={e => setFormData({ ...formData, branch: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
            >
              <option>Computing</option>
              <option>Networking</option>
              <option>Multimedia</option>
              <option>Business</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Year
            </label>
            <select
              value={formData.year}
              onChange={e => setFormData({ ...formData, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
            >
              <option>1st</option>
              <option>2nd</option>
              <option>3rd</option>
            </select>
          </div>
        </div>

        {/* File Input */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            File *
          </label>
          <input
            type="file"
            onChange={e => setFormData({ ...formData, file: e.target.files?.[0] || null })}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.png,.gif,.mp4,.mov"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
          />
          {fileName && (
            <p className="text-sm text-gray-600 mt-2">Selected: {truncate(fileName, 30)}</p>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          isLoading={isUploading}
          className="w-full bg-[#4F7C82] hover:bg-[#0B2E33] text-white"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Resource
        </Button>
      </form>
    </Modal>
  );
};

export default function Library() {
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'mine'
  const [resources, setResources] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [myUploads, setMyUploads] = useState([]);
  const [isLoadingMine, setIsLoadingMine] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRating, setIsRating] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBranch, setSelectedBranch] = useState('All');
  const [selectedYear, setSelectedYear] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const CATEGORIES = [
    { value: 'All', label: 'All' },
    { value: 'NOTES', label: 'Notes' },
    { value: 'PAST_PAPERS', label: 'Past Papers' },
    { value: 'ASSIGNMENTS', label: 'Assignments' },
    { value: 'BOOKS', label: 'Books' },
    { value: 'VIDEOS', label: 'Videos' },
    { value: 'OTHER', label: 'Other' },
  ];
  const BRANCHES = ['All', 'Computing', 'Networking', 'Multimedia', 'Business'];
  const YEARS = ['All', '1st', '2nd', '3rd'];

  // Load public resources
  useEffect(() => {
    if (activeTab === 'browse') loadResources();
  }, [searchQuery, selectedCategory, selectedBranch, selectedYear, currentPage, activeTab]);

  // Load user's own uploads
  useEffect(() => {
    if (activeTab === 'mine') loadMyUploads();
  }, [activeTab]);

  const loadMyUploads = async () => {
    setIsLoadingMine(true);
    try {
      const response = await api.get('/library', { params: { mine: 'true', limit: 50 } });
      setMyUploads(response.data.resources || []);
    } catch (error) {
      console.error('Error loading my uploads:', error);
      toast.error('Failed to load your uploads');
    } finally {
      setIsLoadingMine(false);
    }
  };

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const params = {
        search: searchQuery,
        category: selectedCategory !== 'All' ? selectedCategory : '',
        branch: selectedBranch !== 'All' ? selectedBranch : '',
        year: selectedYear !== 'All' ? selectedYear : '',
        page: currentPage,
        limit: 12,
      };

      const response = await api.get('/library', { params });
      setResources(response.data.resources || []);
      setTotalPages(response.data.pages || 1);
    } catch (error) {
      console.error('Error loading resources:', error);
      toast.error('Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (formData) => {
    setIsUploading(true);
    try {
      await api.post('/library', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Resource uploaded! It will appear after admin approval.');
      setShowUploadModal(false);
      // Switch to My Uploads so the user can see their pending resource
      setActiveTab('mine');
      loadMyUploads();
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const handleRate = async (resourceId, rating, comment) => {
    setIsRating(true);
    try {
      await api.post(`/library/${resourceId}/rate`, {
        rating,
        comment,
      });
      toast.success('Review submitted');
      loadResources();
      return true;
    } catch (error) {
      toast.error('Failed to submit review');
      return false;
    } finally {
      setIsRating(false);
    }
  };

  const handleDownloadResource = async (resourceId) => {
    try {
      await api.post(`/library/${resourceId}/download`);
      // Refresh to update download count in the relevant tab
      if (activeTab === 'mine') {
        loadMyUploads();
      } else {
        loadResources();
      }
    } catch (error) {
      console.error('Failed to record download:', error);
      // Don't block the download even if tracking fails
    }
  };

  const handleViewResource = (resource) => {
    setSelectedResource(resource);
    setShowDetailModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Digital Library</h1>
            <p className="text-gray-600">Discover and share educational resources</p>
          </div>
          {isAuthenticated && (
            <Button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#4F7C82] hover:bg-[#0B2E33] text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Resource
            </Button>
          )}
        </div>

        {/* Tab switcher */}
        {isAuthenticated && (
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('browse')}
              className={cn(
                'px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px',
                activeTab === 'browse'
                  ? 'border-[#4F7C82] text-[#4F7C82]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              Browse Resources
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={cn(
                'px-5 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px',
                activeTab === 'mine'
                  ? 'border-[#4F7C82] text-[#4F7C82]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              My Uploads
              {myUploads.filter(r => r.status === 'PENDING').length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-yellow-400 text-white rounded-full">
                  {myUploads.filter(r => r.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* My Uploads tab content */}
        {activeTab === 'mine' && (
          <div>
            {isLoadingMine ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-3" />
                    <div className="h-6 bg-gray-200 rounded mb-3" />
                    <div className="h-12 bg-gray-200 rounded mb-4" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : myUploads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {myUploads.map(resource => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onView={handleViewResource}
                    isUploader={true}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-12 text-center">
                <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-semibold text-lg">No uploads yet</p>
                <p className="text-sm text-gray-500 mt-1">Share your notes and resources with your fellow students</p>
                <Button
                  onClick={() => setShowUploadModal(true)}
                  className="mt-4 bg-[#4F7C82] hover:bg-[#0B2E33] text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Resource
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Browse Resources tab content — filters + grid */}
        {activeTab === 'browse' && (
        <div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 md:p-6 mb-6 shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Branch
              </label>
              <select
                value={selectedBranch}
                onChange={e => {
                  setSelectedBranch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
              >
                {BRANCHES.map(branch => (
                  <option key={branch}>{branch}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={e => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
              >
                {YEARS.map(year => (
                  <option key={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Resources Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-3" />
                <div className="h-6 bg-gray-200 rounded mb-3" />
                <div className="h-12 bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {resources.map(resource => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                onView={handleViewResource}
                isUploader={resource.uploader?.id === user?.id}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold text-lg">No resources found</p>
            <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or be the first to upload</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    'px-3 py-2 rounded text-sm font-semibold transition',
                    currentPage === page
                      ? 'bg-[#4F7C82] text-white'
                      : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {page}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        </div>
        )}
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      {selectedResource && (
        <ResourceDetailModal
          resource={selectedResource}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedResource(null);
          }}
          onRate={handleRate}
          onDownload={handleDownloadResource}
          isRating={isRating}
        />
      )}
    </div>
  );
}
