import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Play,
  StopCircle,
  Send,
  Flag,
  MessageSquare,
  Video,
  X,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import io from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { Button, Avatar, Modal } from '../components/ui';
import api from '../api/axios';

const STATES = {
  IDLE: 'idle',
  SEARCHING: 'searching',
  MATCHED: 'matched',
};

const RandomChat = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = useAuthStore();
  const [state, setState] = useState(STATES.IDLE);
  const [searchTime, setSearchTime] = useState(0);
  const [partner, setPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const searchIntervalRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search timer
  useEffect(() => {
    if (state === STATES.SEARCHING) {
      searchIntervalRef.current = setInterval(() => setSearchTime((t) => t + 1), 1000);
      return () => clearInterval(searchIntervalRef.current);
    }
  }, [state]);

  // Connect socket and join queue
  const handleStart = () => {
    setState(STATES.SEARCHING);
    setSearchTime(0);
    setMessages([]);

    const socket = io('http://localhost:5000', {
      auth: { token },
      reconnection: false,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('randomChat:join');
    });

    socket.on('connect_error', () => {
      toast.error('Failed to connect. Is the server running?');
      setState(STATES.IDLE);
    });

    socket.on('randomChat:waiting', () => {
      // Still in queue, stay in searching state
    });

    socket.on('randomChat:matched', ({ partner: matchedPartner }) => {
      clearInterval(searchIntervalRef.current);
      setPartner(matchedPartner);
      setState(STATES.MATCHED);
      toast.success(`Matched with ${matchedPartner.name}!`);
    });

    socket.on('randomChat:message', ({ content, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: content,
          isOwn: false,
          time: new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    });

    socket.on('randomChat:ended', () => {
      toast('Your chat partner left.', { icon: '👋' });
      handleEndChatLocal();
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });
  };

  const handleCancel = () => {
    clearInterval(searchIntervalRef.current);
    if (socketRef.current) {
      socketRef.current.emit('randomChat:leave');
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState(STATES.IDLE);
    setSearchTime(0);
    setConnected(false);
  };

  const handleEndChatLocal = () => {
    clearInterval(searchIntervalRef.current);
    setState(STATES.IDLE);
    setPartner(null);
    setMessages([]);
    setMessageText('');
    setConnected(false);
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };

  const handleEndChat = () => {
    if (socketRef.current) {
      socketRef.current.emit('randomChat:leave');
    }
    handleEndChatLocal();
    toast.success('Chat ended');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !socketRef.current) return;

    const msgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    socketRef.current.emit('randomChat:message', { content: messageText.trim() });
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: messageText.trim(), isOwn: true, time: msgTime },
    ]);
    setMessageText('');
  };

  const handleReport = async (reason) => {
    try {
      setIsReporting(true);
      if (partner?.userId) {
        await api.post('/reports', {
          reportedUserId: partner.userId,
          reason,
          type: 'OTHER',
        });
      }
      toast.success('Report submitted. Thank you!');
      setReportModalOpen(false);
      handleEndChat();
    } catch (error) {
      toast.error('Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };

  // ── IDLE ──
  if (state === STATES.IDLE) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4F7C82] to-[#0B2E33] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Random Chat</h1>
            <p className="text-gray-600">Connect with a random student instantly</p>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">Community Guidelines</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Be respectful and kind</li>
              <li>• No harassment or inappropriate behavior</li>
              <li>• Protect your personal information</li>
              <li>• Report violations using the flag button</li>
            </ul>
          </div>

          <Button onClick={handleStart} size="lg" className="w-full text-lg py-4">
            <Play className="h-5 w-5 mr-2" />
            Start Random Chat
          </Button>
          <p className="text-center text-xs text-gray-400 mt-4">
            You'll be matched with a real student
          </p>
        </div>
      </div>
    );
  }

  // ── SEARCHING ──
  if (state === STATES.SEARCHING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4F7C82] to-[#0B2E33] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl text-center">
          <div className="relative inline-block mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-[#B8E3E9] border-t-[#4F7C82] animate-spin mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Finding a match...</h2>
          <p className="text-gray-500 mb-6">Looking for another student to chat with</p>
          <div className="flex items-center justify-center gap-2 mb-4">
            {connected ? (
              <><Wifi className="h-4 w-4 text-green-500" /><span className="text-sm text-green-600">Connected to server</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-gray-400" /><span className="text-sm text-gray-500">Connecting...</span></>
            )}
          </div>
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <Clock className="h-4 w-4 inline mr-2 text-blue-600" />
            <span className="text-blue-900 font-semibold">{searchTime}s</span>
          </div>
          <Button onClick={handleCancel} variant="secondary" className="w-full">
            <X className="h-5 w-5 mr-2" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── MATCHED ──
  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={partner?.name} size="lg" />
            <div>
              <h2 className="font-semibold text-gray-900">{partner?.name}</h2>
              <p className="text-sm text-gray-500">{partner?.course || 'Student'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setReportModalOpen(true)} variant="secondary" size="sm" className="text-red-600">
              <Flag className="h-4 w-4 mr-2" />
              Report
            </Button>
            <Button onClick={handleEndChat} variant="danger" size="sm">
              <X className="h-4 w-4 mr-2" />
              End Chat
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">You matched! Say hello 👋</p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-2xl px-4 py-2.5 ${msg.isOwn ? 'bg-[#4F7C82] text-white' : 'bg-white border border-gray-200 text-gray-900'}`}>
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.isOwn ? 'text-[#B8E3E9]' : 'text-gray-400'}`}>{msg.time}</p>
                </div>
              </div>
            ))
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#4F7C82] focus:border-transparent outline-none text-sm"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="p-2.5 rounded-full bg-[#4F7C82] hover:bg-[#0B2E33] disabled:opacity-50 text-white transition"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Report Modal */}
      <Modal isOpen={reportModalOpen} onClose={() => setReportModalOpen(false)} title="Report User" size="md">
        <ReportForm onSubmit={handleReport} onClose={() => setReportModalOpen(false)} isLoading={isReporting} />
      </Modal>
    </>
  );
};

const ReportForm = ({ onSubmit, onClose, isLoading }) => {
  const [reason, setReason] = useState('inappropriate');
  const reasons = [
    { value: 'inappropriate', label: 'Inappropriate behavior' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'spam', label: 'Spam or scam' },
    { value: 'abuse', label: 'Abuse or hate speech' },
    { value: 'other', label: 'Other' },
  ];
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(reason); }} className="space-y-4">
      <p className="text-sm text-gray-600">Select the reason for reporting:</p>
      <div className="space-y-2">
        {reasons.map((r) => (
          <label key={r.value} className="flex items-center gap-3 cursor-pointer">
            <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={(e) => setReason(e.target.value)} className="w-4 h-4" />
            <span className="text-gray-900 text-sm">{r.label}</span>
          </label>
        ))}
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">Cancel</Button>
        <Button type="submit" disabled={isLoading} className="flex-1">Submit Report</Button>
      </div>
    </form>
  );
};

export default RandomChat;
