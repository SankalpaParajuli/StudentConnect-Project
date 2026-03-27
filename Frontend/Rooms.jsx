import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import {
  Plus,
  Users,
  Lock,
  Unlock,
  Clock,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  LogOut,
  Eye,
  EyeOff,
  Send,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button, Avatar, Badge, Input, Modal } from '../components/ui';
import api from '../api/axios';
import { formatDate, formatDuration, cn } from '../lib/utils';

// Room Card Component
const RoomCard = ({ room, onJoin }) => {
  const spotsLeft = room.maxParticipants - (room.participants?.length || 0);
  const isFull = spotsLeft <= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {room.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {room.description}
          </p>
        </div>
        <Badge
          variant={room.isPublic ? 'success' : 'info'}
          size="sm"
          className="ml-2 flex-shrink-0"
        >
          {room.isPublic ? 'Public' : 'Private'}
        </Badge>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Avatar
            name={room.host?.name}
            size="sm"
          />
          <span>{room.host?.name}</span>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{room.participants?.length || 0}/{room.maxParticipants}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(room.timeRemaining || 0)}</span>
          </div>
        </div>
      </div>

      <Button
        onClick={() => onJoin(room)}
        disabled={isFull}
        className="w-full"
        variant={isFull ? 'secondary' : 'primary'}
      >
        {isFull ? 'Room Full' : 'Join Room'}
      </Button>
    </div>
  );
};

// Create Room Modal
const CreateRoomModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    password: '',
    maxParticipants: 10,
    maxDuration: 60,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({
      name: '',
      description: '',
      isPublic: true,
      password: '',
      maxParticipants: 10,
      maxDuration: 60,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Study Room" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Room Name
          </label>
          <Input
            type="text"
            placeholder="e.g., Biology Study Group"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none"
            placeholder="What will you study?"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Room Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roomType"
                checked={formData.isPublic}
                onChange={() =>
                  setFormData({
                    ...formData,
                    isPublic: true,
                    password: '',
                  })
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Public
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="roomType"
                checked={!formData.isPublic}
                onChange={() =>
                  setFormData({ ...formData, isPublic: false })
                }
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Private
              </span>
            </label>
          </div>
        </div>

        {!formData.isPublic && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Room Password
            </label>
            <Input
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              required={!formData.isPublic}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Participants: {formData.maxParticipants}
          </label>
          <input
            type="range"
            min="2"
            max="20"
            value={formData.maxParticipants}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxParticipants: parseInt(e.target.value),
              })
            }
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Duration: {formatDuration(formData.maxDuration)}
          </label>
          <input
            type="range"
            min="15"
            max="120"
            step="15"
            value={formData.maxDuration}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxDuration: parseInt(e.target.value),
              })
            }
            className="w-full"
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
            disabled={!formData.name.trim() || isLoading}
            className="flex-1"
          >
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Join Room Modal
const JoinRoomModal = ({ isOpen, onClose, room, onSubmit, isLoading }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(room.id, password);
    setPassword('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Join "${room?.name}"`}
      size="md"
    >
      {!room?.isPublic ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This is a private room. Enter the password to join.
          </p>
          <Input
            type="password"
            placeholder="Enter room password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
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
              disabled={!password.trim() || isLoading}
              className="flex-1"
            >
              Join Room
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You are about to join this room.
          </p>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onSubmit(room.id, '')}
              disabled={isLoading}
              className="flex-1"
            >
              Join Room
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

// Room Session View
const RoomSession = ({ room, onLeave }) => {
  const { user, token } = useAuthStore();  // token used for socket auth
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [timeLeft, setTimeLeft] = useState(room.maxDuration ? room.maxDuration * 60 : 3600);
  const [localStream, setLocalStream] = useState(null);
  const [cameraError, setCameraError] = useState(false);
  const localVideoRef = React.useRef(null);
  const chatEndRef = React.useRef(null);
  const socketRef = React.useRef(null);

  // Get participants — handles both nested {user:{...}} and flat structures
  const participants = (room.participants || []).filter(
    (p) => (p.user?.id || p.userId) !== user?.id
  );

  // Start camera on mount
  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Camera/mic not available:', err.message);
        setCameraError(true);
      }
    };
    startCamera();

    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Connect socket for room chat
  useEffect(() => {
    if (!token) return;
    const socket = io('http://localhost:5000', { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinRoom', { roomId: room.id });
    });

    socket.on('room:message', ({ userId: senderId, content, timestamp }) => {
      const senderName = senderId === user?.id
        ? user?.name
        : (room.participants?.find((p) => (p.user?.id || p.userId) === senderId)?.user?.name || 'Participant');
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), userName: senderName, content, timestamp: new Date(timestamp), isOwn: senderId === user?.id },
      ]);
    });

    return () => {
      socket.emit('leaveRoom', { roomId: room.id });
      socket.disconnect();
    };
  }, [room.id, token]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { onLeave(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onLeave]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = isMuted; });
    }
    setIsMuted(!isMuted);
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = isCameraOff; });
    }
    setIsCameraOff(!isCameraOff);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const socket = socketRef.current;
    if (socket) {
      socket.emit('roomMessage', { roomId: room.id, content: message.trim() });
    }
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), userName: user?.name || 'You', content: message.trim(), timestamp: new Date(), isOwn: true },
    ]);
    setMessage('');
  };

  const formatTimeLeft = () => {
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-gray-400">
            {room.participants?.length || 1} participant{(room.participants?.length || 1) !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-mono font-bold text-[#4F7C82]">{formatTimeLeft()}</div>
            <p className="text-xs text-gray-400">Time remaining</p>
          </div>
          <Button onClick={onLeave} variant="danger" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Leave Room
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Video Grid */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {/* Local Video */}
            <div className="bg-gray-800 rounded-lg overflow-hidden relative min-h-[200px]">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <VideoOff className="h-12 w-12 mb-2" />
                  <p className="text-sm">Camera not available</p>
                </div>
              ) : (
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              )}
              <div className="absolute bottom-3 left-3 bg-black/60 px-2 py-1 rounded text-sm">
                {user?.name} (You)
              </div>
              {isMuted && <div className="absolute top-3 left-3 bg-red-600 rounded-full p-1"><MicOff className="h-3 w-3" /></div>}
            </div>

            {/* Other Participants */}
            {participants.slice(0, 3).map((participant) => {
              const pUser = participant.user || participant;
              const pName = pUser.name || 'Participant';
              return (
                <div key={pUser.id || participant.id} className="bg-gray-800 rounded-lg overflow-hidden relative min-h-[200px]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <Avatar name={pName} size="xl" className="mb-2" />
                    <p className="text-sm text-white">{pName}</p>
                  </div>
                  {user?.id === room.host?.id && (
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button className="bg-gray-700/80 hover:bg-gray-600 p-1.5 rounded transition"><MicOff className="h-3 w-3" /></button>
                      <button className="bg-red-600/80 hover:bg-red-700 p-1.5 rounded transition"><X className="h-3 w-3" /></button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty slot if only 1 person */}
            {participants.length === 0 && (
              <div className="bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 min-h-[200px]">
                <div className="text-center">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Waiting for others to join...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-center gap-4">
            <Button onClick={toggleMute} variant={isMuted ? 'danger' : 'secondary'} size="sm" className="rounded-full p-3">
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button onClick={toggleCamera} variant={isCameraOff ? 'danger' : 'secondary'} size="sm" className="rounded-full p-3">
              {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button onClick={onLeave} variant="danger" size="sm" className="rounded-full p-3 ml-auto">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-72 bg-gray-800 rounded-lg flex flex-col overflow-hidden">
          <div className="px-4 py-3 font-semibold border-b border-gray-700 text-sm">Room Chat</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-500 text-xs text-center mt-4">No messages yet</p>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`text-sm ${msg.isOwn ? 'text-right' : ''}`}>
                <span className="text-xs text-[#93B1B5] font-semibold">{msg.isOwn ? 'You' : msg.userName}</span>
                <div className={`inline-block mt-0.5 px-3 py-1.5 rounded-lg text-left ${msg.isOwn ? 'bg-[#4F7C82] text-white ml-4' : 'bg-gray-700 text-gray-100'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="border-t border-gray-700 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg text-xs focus:ring-1 focus:ring-[#4F7C82] outline-none"
              />
              <button type="submit" disabled={!message.trim()} className="p-2 rounded-lg bg-[#4F7C82] hover:bg-[#0B2E33] disabled:opacity-50 transition-colors">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Rooms = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchRooms();
  }, [isAuthenticated, navigate]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rooms');
      setRooms(response.data.rooms || []);
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (formData) => {
    try {
      setIsCreating(true);
      const response = await api.post('/rooms', {
        ...formData,
        maxDuration: formData.maxDuration * 60,
      });

      const newRoom = response.data.room;
      setRooms([newRoom, ...rooms]);
      setCreateModalOpen(false);
      toast.success('Room created successfully!');

      // Join the created room
      await handleJoinRoom(newRoom, '');
    } catch (error) {
      console.error('Failed to create room:', error);
      toast.error(error.response?.data?.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setJoinModalOpen(true);
  };

  const handleJoinRoom = async (room, password) => {
    try {
      setIsJoining(true);
      const response = await api.post(`/rooms/${room.id}/join`, { password });
      setCurrentRoom(response.data.room || room);
      setJoinModalOpen(false);
      toast.success('Joined room!');
    } catch (error) {
      console.error('Failed to join room:', error);
      toast.error(error.response?.data?.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoom) return;

    try {
      await api.post(`/rooms/${currentRoom.id}/leave`);
      setCurrentRoom(null);
      await fetchRooms();
      toast.success('Left room');
    } catch (error) {
      console.error('Failed to leave room:', error);
      toast.error('Failed to leave room');
    }
  };

  if (currentRoom) {
    return <RoomSession room={currentRoom} onLeave={handleLeaveRoom} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Study Rooms
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Join or create a study room for collaborative learning
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Create Room
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded mb-4 w-3/4" />
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-4 w-2/3" />
                <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        ) : rooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onJoin={handleSelectRoom}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No active rooms
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a room to start studying with others
            </p>
            <Button onClick={() => setCreateModalOpen(true)}>
              Create First Room
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateRoomModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateRoom}
        isLoading={isCreating}
      />

      {selectedRoom && (
        <JoinRoomModal
          isOpen={joinModalOpen}
          onClose={() => {
            setJoinModalOpen(false);
            setSelectedRoom(null);
          }}
          room={selectedRoom}
          onSubmit={handleJoinRoom}
          isLoading={isJoining}
        />
      )}
    </div>
  );
};

export default Rooms;
