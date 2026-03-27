import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  MessageCircle,
  Trash2,
  Search,
  Clock,
  Users,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Avatar, Badge, Button } from '../components/ui';
import { cn } from '../lib/utils';
import api from '../api/axios';

// Friend card component
const FriendCard = ({ friend, onMessage, onVideoCall, onRemove, isLoading }) => (
  <div className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow">
    <div className="flex flex-col items-center text-center mb-4">
      <div className="relative mb-3">
        <Avatar name={friend.fullName || friend.name} size="lg" />
      </div>
      <h3 className="font-semibold text-gray-900">{friend.fullName || friend.name}</h3>
      <p className="text-xs text-gray-600 mt-1">{friend.year} - {friend.course}</p>
    </div>
    <div className="flex gap-2">
      <Button
        onClick={() => onMessage(friend.id || friend._id)}
        variant="outline"
        size="sm"
        className="flex-1 flex items-center justify-center gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        Message
      </Button>
      <Button
        onClick={() => onVideoCall(friend.id || friend._id)}
        variant="outline"
        size="sm"
        className="flex-1 flex items-center justify-center gap-2 text-teal-600 hover:bg-teal-50"
      >
        <Video className="h-4 w-4" />
        Call
      </Button>
      <Button
        onClick={() => onRemove(friend.id || friend._id)}
        isLoading={isLoading}
        variant="ghost"
        size="sm"
        className="flex items-center justify-center gap-2 text-red-600 hover:bg-red-50"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

// Request card component
const RequestCard = ({ request, type = 'incoming', onAccept, onDecline, onCancel, isLoading }) => (
  <div className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <Avatar name={request.fullName || request.name} size="md" />
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{request.fullName || request.name}</h3>
        <p className="text-xs text-gray-600">{request.year} - {request.course}</p>
      </div>
    </div>
    {type === 'incoming' ? (
      <div className="flex gap-2">
        <Button
          onClick={() => onAccept(request.id || request._id)}
          isLoading={isLoading}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          size="sm"
        >
          Accept
        </Button>
        <Button
          onClick={() => onDecline(request.id || request._id)}
          isLoading={isLoading}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Decline
        </Button>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-gray-200 text-gray-900 flex-1 text-center">
          Pending
        </Badge>
        <Button
          onClick={() => onCancel(request.userId || request.id || request._id)}
          isLoading={isLoading}
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )}
  </div>
);

// Search result card component
const UserResultCard = ({ user, status, onAddFriend, onCancel, isLoading }) => (
  <div className="bg-white rounded-lg p-4 shadow hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <Avatar name={user.fullName || user.name} size="md" />
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{user.fullName || user.name}</h3>
        <p className="text-xs text-gray-600">{user.year} - {user.course}</p>
      </div>
    </div>
    {status === 'friend' ? (
      <Badge className="w-full text-center bg-green-100 text-green-700">
        Friends
      </Badge>
    ) : status === 'pending' ? (
      <div className="flex items-center gap-2">
        <Badge className="flex-1 text-center bg-yellow-100 text-yellow-700">
          Pending
        </Badge>
        <Button
          onClick={() => onCancel(user.id || user._id)}
          isLoading={isLoading}
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ) : (
      <Button
        onClick={() => onAddFriend(user.id || user._id)}
        isLoading={isLoading}
        className="w-full bg-[#4F7C82] hover:bg-[#0B2E33] text-white"
        size="sm"
      >
        <UserPlus className="h-4 w-4 mr-2" />
        Add Friend
      </Button>
    )}
  </div>
);

export default function Friends() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userStatuses, setUserStatuses] = useState({});

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (isAuthenticated && user) {
      loadFriendsData();
    }
  }, [isAuthenticated, user]);

  const loadFriendsData = async () => {
    setIsLoadingFriends(true);
    try {
      const [friendsRes, incomingRes, sentRes] = await Promise.all([
        api.get('/users/friends'),
        api.get('/users/friend-requests?type=incoming'),
        api.get('/users/friend-requests?type=sent'),
      ]);

      setFriends(friendsRes.data.friends || []);
      setIncomingRequests(incomingRes.data.requests || []);
      setSentRequests(sentRes.data.requests || []);
    } catch (error) {
      console.error('Error loading friends data:', error);
      toast.error('Failed to load friends');
    } finally {
      setIsLoadingFriends(false);
    }
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setUserStatuses({});
      return;
    }

    setIsSearching(true);
    try {
      const response = await api.get('/users', {
        params: { search: query, page: 1, limit: 20 }
      });

      const results = response.data.users || [];
      setSearchResults(results);

      // Determine status for each user
      const statuses = {};
      results.forEach(u => {
        const uid = u.id || u._id;
        if (friends.some(f => (f.id || f._id) === uid)) {
          statuses[uid] = 'friend';
        } else if (sentRequests.some(r => r.userId === uid)) {
          statuses[uid] = 'pending';
        } else {
          statuses[uid] = 'none';
        }
      });
      setUserStatuses(statuses);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (targetUserId) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      await api.post('/users/friends/request', { receiverId: targetUserId });
      toast.success('Friend request sent');
      const sentUser = searchResults.find(u => (u.id || u._id) === targetUserId);
      if (sentUser) setSentRequests([...sentRequests, { ...sentUser, userId: targetUserId }]);
      setUserStatuses(prev => ({ ...prev, [targetUserId]: 'pending' }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleCancelRequest = async (targetUserId) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    try {
      await api.delete(`/users/friends/${targetUserId}`);
      toast.success('Request cancelled');
      setSentRequests(sentRequests.filter(r => (r.userId || r.id) !== targetUserId));
      setUserStatuses(prev => ({ ...prev, [targetUserId]: 'none' }));
    } catch (error) {
      toast.error('Failed to cancel request');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleAcceptRequest = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const req = incomingRequests.find(r => r.id === requestId);
      const requesterId = req?.requesterId;
      await api.put(`/users/friends/${requesterId}/accept`);
      toast.success('Friend request accepted');

      if (req) {
        setFriends([...friends, { ...req, id: req.userId, fullName: req.name }]);
        setIncomingRequests(incomingRequests.filter(r => r.id !== requestId));
      }
    } catch (error) {
      toast.error('Failed to accept request');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleDeclineRequest = async (requestId) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const req = incomingRequests.find(r => r.id === requestId);
      const requesterId = req?.requesterId;
      await api.put(`/users/friends/${requesterId}/decline`);
      toast.success('Friend request declined');
      setIncomingRequests(incomingRequests.filter(r => r.id !== requestId));
    } catch (error) {
      toast.error('Failed to decline request');
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRemoveFriend = async (friendId) => {
    setActionLoading(prev => ({ ...prev, [friendId]: true }));
    try {
      await api.delete(`/users/friends/${friendId}`);
      toast.success('Friend removed');
      setFriends(friends.filter(f => f.id !== friendId));
    } catch (error) {
      toast.error('Failed to remove friend');
    } finally {
      setActionLoading(prev => ({ ...prev, [friendId]: false }));
    }
  };

  const handleMessage = (friendId) => {
    navigate(`/chat/${friendId}`);
  };

  const handleVideoCall = (friendId) => {
    navigate(`/video-call/${friendId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Friends</h1>
          <p className="text-gray-600">Manage your connections and find new friends</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {[
            { id: 'friends', label: 'My Friends', icon: Users },
            { id: 'requests', label: `Requests (${incomingRequests.length})`, icon: Clock },
            { id: 'find', label: 'Find People', icon: UserPlus },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'find') {
                    setSearchQuery('');
                    setSearchResults([]);
                  }
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-[#4F7C82] text-[#4F7C82]'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'friends' && (
          <div>
            {isLoadingFriends ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto mb-4" />
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-200 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friends.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {friends.map(friend => (
                  <FriendCard
                    key={friend.id || friend._id}
                    friend={friend}
                    onMessage={handleMessage}
                    onVideoCall={handleVideoCall}
                    onRemove={handleRemoveFriend}
                    isLoading={actionLoading[friend.id || friend._id]}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-semibold text-lg">No friends yet</p>
                <p className="text-sm text-gray-500 mt-1">Search for people to add as friends</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingRequests ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-4" />
                  <div className="space-y-2">
                    <div className="h-8 bg-gray-200 rounded" />
                  </div>
                </div>
              ))
            ) : (
              <>
                {incomingRequests.length > 0 && (
                  <div className="col-span-full">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Incoming Requests</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {incomingRequests.map(request => (
                        <RequestCard
                          key={request.id || request._id}
                          request={request}
                          type="incoming"
                          onAccept={handleAcceptRequest}
                          onDecline={handleDeclineRequest}
                          isLoading={actionLoading[request.id || request._id]}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div className="col-span-full">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Sent Requests</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sentRequests.map(request => (
                        <RequestCard
                          key={request.id || request._id || request.userId}
                          request={request}
                          type="sent"
                          onCancel={handleCancelRequest}
                          isLoading={actionLoading[request.userId || request.id || request._id]}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {incomingRequests.length === 0 && sentRequests.length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Clock className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold text-lg">No requests</p>
                    <p className="text-sm text-gray-500 mt-1">Your friend requests will appear here</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'find' && (
          <div>
            {/* Search Bar */}
            <div className="mb-6 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, course, or year..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
              />
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full mb-3" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-2/3 mb-4" />
                    <div className="h-8 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : searchQuery.trim() ? (
              <>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map(result => (
                      <UserResultCard
                        key={result.id || result._id}
                        user={result}
                        status={userStatuses[result.id || result._id]}
                        onAddFriend={handleAddFriend}
                        onCancel={handleCancelRequest}
                        isLoading={actionLoading[result._id]}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 font-semibold text-lg">No users found</p>
                    <p className="text-sm text-gray-500 mt-1">Try a different search term</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-semibold text-lg">Search for people</p>
                <p className="text-sm text-gray-500 mt-1">Enter a name, course, or year to find friends</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
