import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  Send,
  Phone,
  Info,
  X,
  MessageCircle,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { Avatar, Badge, Button, Input, Modal } from '../components/ui';
import { cn, formatDate, formatTime, truncate, isToday } from '../lib/utils';
import api from '../api/axios';

// Typing indicator animation component
const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-3">
    <div className="flex gap-1">
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  </div>
);

// Message group component
const MessageGroup = ({ messages, currentUserId, senderId, senderInfo }) => {
  const isOwn = senderId === currentUserId;

  return (
    <div className={cn('flex gap-3 mb-4', isOwn ? 'flex-row-reverse' : 'flex-row')}>
      {!isOwn && <Avatar name={senderInfo?.fullName || 'User'} size="sm" />}
      <div className={cn('flex flex-col gap-1 max-w-xs', isOwn ? 'items-end' : 'items-start')}>
        {messages.map((msg, idx) => (
          <div key={msg._id || idx}>
            <div
              className={cn(
                'px-4 py-2 rounded-lg break-words',
                isOwn
                  ? 'bg-[#4F7C82] text-white rounded-br-none'
                  : 'bg-gray-200 text-gray-900 rounded-bl-none'
              )}
            >
              <p className="text-sm">{msg.content}</p>
            </div>
            {idx === messages.length - 1 && (
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                <span>{formatTime(msg.createdAt)}</span>
                {isOwn && (
                  <>
                    {msg.read ? (
                      <CheckCheck className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Message request card
const MessageRequestCard = ({ sender, onAccept, onDecline, isLoading }) => (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <Avatar name={sender.fullName} size="md" />
        <div>
          <p className="font-semibold text-gray-900">{sender.fullName}</p>
          <p className="text-sm text-gray-600">{sender.year} - {sender.course}</p>
        </div>
      </div>
    </div>
    <p className="text-sm text-gray-700 mb-4">Wants to send you a message</p>
    <div className="flex gap-2">
      <Button
        onClick={() => onAccept(sender._id)}
        isLoading={isLoading}
        className="bg-blue-500 hover:bg-blue-600 text-white flex-1"
      >
        Accept
      </Button>
      <Button
        onClick={() => onDecline(sender._id)}
        isLoading={isLoading}
        variant="outline"
        className="flex-1"
      >
        Decline
      </Button>
    </div>
  </div>
);

// Conversation list item
const ConversationItem = ({ conversation, isSelected, onlineUsers, onSelect }) => {
  const isOnline = onlineUsers.includes(conversation.participantId);
  const displayName = conversation.participantName || 'Unknown';

  return (
    <div
      onClick={onSelect}
      className={cn(
        'p-3 cursor-pointer rounded-lg transition-colors border-l-4',
        isSelected
          ? 'bg-blue-50 border-l-[#4F7C82]'
          : 'hover:bg-gray-100 border-l-transparent'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar name={displayName} size="md" />
          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-semibold text-gray-900">{displayName}</p>
            <span className="text-xs text-gray-500">{formatDate(conversation.lastMessageTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 truncate">{truncate(conversation.lastMessage, 30)}</p>
            {conversation.unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs ml-2">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Chat() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { user, isAuthenticated } = useAuthStore();
  const {
    conversations,
    messages,
    selectedUser,
    onlineUsers,
    getConversations,
    getMessages,
    sendMessage,
    setSelectedUser,
    markAsRead,
  } = useChatStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [messageRequests, setMessageRequests] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const messagesEndRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
  const [showConversationList, setShowConversationList] = useState(true);
  // People search (new chat)
  const [showPeopleSearch, setShowPeopleSearch] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [isSearchingPeople, setIsSearchingPeople] = useState(false);
  const peopleSearchTimeout = useRef(null);

  // Initialize conversations
  useEffect(() => {
    if (isAuthenticated && user) {
      loadConversations();
      loadMessageRequests();
    }
  }, [isAuthenticated, user]);

  // Handle window resize for mobile view
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setIsMobileView(isMobile);
      if (!isMobile) {
        setShowConversationList(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages[selectedUser?._id]]);

  // Load messages when selected user changes
  useEffect(() => {
    if (selectedUser) {
      const uid = selectedUser.id || selectedUser._id;
      loadMessages(uid);
      markAsRead(uid);
      if (isMobileView) {
        setShowConversationList(false);
      }
    }
  }, [selectedUser]);

  // Set selected user from URL param
  useEffect(() => {
    if (userId && conversations.length > 0) {
      const conv = conversations.find(c => c.participantId === userId);
      if (conv) {
        setSelectedUser({ id: conv.participantId, _id: conv.participantId, fullName: conv.participantName });
      }
    }
  }, [userId, conversations]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const result = await getConversations();
      if (!result.success) {
        toast.error('Failed to load conversations');
      }
    } catch (error) {
      toast.error('Error loading conversations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (targetUserId) => {
    try {
      const result = await getMessages(targetUserId);
      if (!result.success) {
        toast.error('Failed to load messages');
      }
    } catch (error) {
      toast.error('Error loading messages');
    }
  };

  const loadMessageRequests = async () => {
    setIsLoadingRequests(true);
    try {
      const response = await api.get('/messages/requests');
      if (response.data) {
        setMessageRequests(response.data.requests || []);
      }
    } catch (error) {
      console.error('Failed to load message requests:', error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedUser) {
      return;
    }

    setIsSending(true);
    try {
      const result = await sendMessage(selectedUser.id || selectedUser._id, messageInput.trim());
      if (result.success) {
        setMessageInput('');
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      await api.post(`/messages/${requesterId}/approve`);
      toast.success('Message request accepted');
      setMessageRequests(messageRequests.filter(r => r._id !== requesterId));
      loadConversations();
    } catch (error) {
      toast.error('Failed to accept request');
    }
  };

  const handleDeclineRequest = async (requesterId) => {
    try {
      await api.delete(`/messages/${requesterId}/decline`);
      toast.success('Message request declined');
      setMessageRequests(messageRequests.filter(r => r._id !== requesterId));
    } catch (error) {
      toast.error('Failed to decline request');
    }
  };

  const searchPeople = async (query) => {
    if (!query.trim()) {
      setPeopleResults([]);
      return;
    }
    setIsSearchingPeople(true);
    try {
      const response = await api.get(`/users?search=${encodeURIComponent(query)}`);
      setPeopleResults(response.data.users || []);
    } catch (error) {
      console.error('People search error:', error);
      setPeopleResults([]);
    } finally {
      setIsSearchingPeople(false);
    }
  };

  const handlePeopleQueryChange = (e) => {
    const val = e.target.value;
    setPeopleQuery(val);
    clearTimeout(peopleSearchTimeout.current);
    peopleSearchTimeout.current = setTimeout(() => searchPeople(val), 300);
  };

  const handleStartChatWith = (person) => {
    setSelectedUser({
      id: person.id,
      _id: person.id,
      fullName: person.name,
    });
    setShowPeopleSearch(false);
    setPeopleQuery('');
    setPeopleResults([]);
    if (isMobileView) setShowConversationList(false);
  };

  const filteredConversations = conversations.filter(conv =>
    (conv.participantName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupMessagesByDate = (msgs) => {
    const grouped = {};
    (msgs || []).forEach(msg => {
      const date = new Date(msg.createdAt).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(msg);
    });
    return grouped;
  };

  const userMessages = selectedUser ? messages[selectedUser.id || selectedUser._id] || [] : [];
  const groupedMessages = groupMessagesByDate(userMessages);

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Left Panel - Conversations */}
      {showConversationList && (
        <div className="w-full md:w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search Bar + New Chat */}
          <div className="p-4 border-b border-gray-200 space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82] text-sm"
                />
              </div>
              <button
                onClick={() => { setShowPeopleSearch(!showPeopleSearch); setPeopleQuery(''); setPeopleResults([]); }}
                className={cn(
                  'p-2 rounded-lg border transition-colors flex-shrink-0',
                  showPeopleSearch
                    ? 'bg-[#4F7C82] text-white border-[#4F7C82]'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                )}
                title="New chat"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>

            {/* People Search Panel */}
            {showPeopleSearch && (
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search people by name..."
                    value={peopleQuery}
                    onChange={handlePeopleQueryChange}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2 border border-[#4F7C82] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82] text-sm"
                  />
                </div>
                {isSearchingPeople ? (
                  <div className="mt-2 text-xs text-gray-500 px-2">Searching...</div>
                ) : peopleResults.length > 0 ? (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                    {peopleResults.map(person => (
                      <button
                        key={person.id}
                        onClick={() => handleStartChatWith(person)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <Avatar name={person.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{person.name}</p>
                          <p className="text-xs text-gray-500 truncate">{person.course || person.email || ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : peopleQuery.trim() ? (
                  <div className="mt-2 text-xs text-gray-500 px-2">No users found</div>
                ) : null}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('chats')}
              className={cn(
                'flex-1 py-3 px-4 font-semibold text-center border-b-2 transition-colors',
                activeTab === 'chats'
                  ? 'border-[#4F7C82] text-[#4F7C82]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={cn(
                'flex-1 py-3 px-4 font-semibold text-center border-b-2 transition-colors relative',
                activeTab === 'requests'
                  ? 'border-[#4F7C82] text-[#4F7C82]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              )}
            >
              Requests
              {messageRequests.length > 0 && (
                <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs">
                  {messageRequests.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chats' ? (
              <>
                {isLoading ? (
                  <div className="p-4 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="p-3 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  <div className="p-3 space-y-1">
                    {filteredConversations.map(conversation => (
                      <ConversationItem
                        key={conversation.participantId}
                        conversation={conversation}
                        isSelected={(selectedUser?.id || selectedUser?._id) === conversation.participantId}
                        onlineUsers={onlineUsers}
                        onSelect={() => {
                          setSelectedUser({
                            id: conversation.participantId,
                            _id: conversation.participantId,
                            fullName: conversation.participantName,
                          });
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-semibold">No conversations yet</p>
                    <p className="text-sm text-gray-500">Start a conversation with a friend</p>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 space-y-3">
                {isLoadingRequests ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 bg-gray-100 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : messageRequests.length > 0 ? (
                  messageRequests.map(request => (
                    <MessageRequestCard
                      key={request._id}
                      sender={request}
                      onAccept={handleAcceptRequest}
                      onDecline={handleDeclineRequest}
                      isLoading={false}
                    />
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-semibold">No requests</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Panel - Chat Area */}
      {selectedUser && (!showConversationList || !isMobileView) && (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              {isMobileView && (
                <button
                  onClick={() => setShowConversationList(true)}
                  className="mr-2"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <div className="relative">
                <Avatar name={selectedUser.fullName} size="md" />
                {onlineUsers.includes(selectedUser._id) && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{selectedUser.fullName}</p>
                <p className="text-xs text-gray-500">
                  {onlineUsers.includes(selectedUser._id) ? 'Online' : 'Offline'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                onClick={() => navigate(`/video-call/${selectedUser.id || selectedUser._id}`)}
                title="Start video call"
              >
                <Phone className="h-5 w-5 text-gray-600" />
              </Button>
              <Button variant="ghost" size="sm" className="p-2">
                <Info className="h-5 w-5 text-gray-600" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {userMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([date, msgs]) => {
                // Build groups of consecutive messages from the same sender
                const groups = [];
                let i = 0;
                while (i < msgs.length) {
                  const group = [msgs[i]];
                  while (i + 1 < msgs.length && msgs[i + 1].senderId === msgs[i].senderId) {
                    i++;
                    group.push(msgs[i]);
                  }
                  groups.push(group);
                  i++;
                }
                return (
                  <div key={date}>
                    <div className="flex justify-center mb-4">
                      <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
                        {date === new Date().toLocaleDateString() ? 'Today' : date}
                      </span>
                    </div>
                    {groups.map((group) => (
                      <MessageGroup
                        key={group[0].id || group[0]._id}
                        messages={group}
                        currentUserId={user?.id || user?._id}
                        senderId={group[0].senderId}
                        senderInfo={group[0].senderId === (user?.id || user?._id) ? user : selectedUser}
                      />
                    ))}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex gap-3 items-end">
              <Button variant="ghost" size="sm" className="p-2">
                <Paperclip className="h-5 w-5 text-gray-600" />
              </Button>
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F7C82]"
              />
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
              >
                <Smile className="h-5 w-5 text-gray-600" />
              </Button>
              <Button
                onClick={handleSendMessage}
                isLoading={isSending}
                disabled={!messageInput.trim() || isSending}
                className="bg-[#4F7C82] hover:bg-[#0B2E33] text-white"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedUser && !isMobileView && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-semibold text-lg">Select a conversation</p>
            <p className="text-sm text-gray-500 mt-1">Choose from your chats to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
}
