import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  PhoneOff,
  Download,
  Upload,
  Settings,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { Button, Avatar, Modal } from '../components/ui';
import api from '../api/axios';
import { formatTime } from '../lib/utils';

// Call States
const CALL_STATES = {
  IDLE: 'idle',
  RINGING: 'ringing',
  ACCEPTED: 'accepted',
  IN_CALL: 'in_call',
  ENDED: 'ended',
};

// Incoming Call Modal
const IncomingCallModal = ({ isOpen, caller, onAccept, onReject }) => {
  return (
    <Modal isOpen={isOpen} onClose={() =>{}} size="sm">
      <div className="text-center py-6">
        <Avatar name={caller?.name} size="xl" className="mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {caller?.name}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          is calling...
        </p>

        <div className="flex gap-3">
          <Button
            onClick={onReject}
            variant="danger"
            className="flex-1"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            Decline
          </Button>
          <Button
            onClick={onAccept}
            className="flex-1"
          >
            <Phone className="h-4 w-4 mr-2" />
            Accept
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// Call Screen Component
const CallScreen = ({
  callState,
  remoteUser,
  localVideoRef,
  remoteVideoRef,
  callDuration,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onScreenShare,
}) => {
  if (callState === CALL_STATES.RINGING) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#4F7C82] to-[#0B2E33] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="mb-8">
            <Avatar name={remoteUser?.name} size="xl" className="mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-2">{remoteUser?.name}</h1>
            <p className="text-[#B8E3E9]">Calling...</p>
          </div>

          <div className="animate-pulse">
            <div className="w-16 h-16 border-4 border-white rounded-full mx-auto animate-spin" />
          </div>

          <Button
            onClick={onEndCall}
            variant="danger"
            size="lg"
            className="mt-8 rounded-full p-6"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  if (callState === CALL_STATES.IN_CALL) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        {/* Videos Container */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {/* Remote Video - Large, Full */}
          <video
            ref={remoteVideoRef}
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Local Video - Picture in Picture */}
          <div className="absolute bottom-4 right-4 w-48 h-40 rounded-lg overflow-hidden border-2 border-white shadow-lg bg-gray-800">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
            {isCameraOff && (
              <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <VideoOff className="h-8 w-8 text-gray-500" />
              </div>
            )}
          </div>

          {/* Call Info */}
          <div className="absolute top-4 left-4 bg-black/60 px-4 py-2 rounded-lg">
            <p className="text-lg font-semibold">{remoteUser?.name}</p>
            <p className="text-sm text-gray-300">{callDuration}</p>
          </div>

          {/* Mute Indicator */}
          {isMuted && (
            <div className="absolute top-4 right-4 bg-red-600/80 px-3 py-2 rounded-lg flex items-center gap-2">
              <MicOff className="h-4 w-4" />
              <span className="text-sm">Muted</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-950 border-t border-gray-800 px-6 py-6 flex items-center justify-center gap-4">
          <Button
            onClick={onToggleMute}
            variant={isMuted ? 'danger' : 'secondary'}
            size="lg"
            className="rounded-full p-4"
          >
            {isMuted ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>

          <Button
            onClick={onToggleCamera}
            variant={isCameraOff ? 'danger' : 'secondary'}
            size="lg"
            className="rounded-full p-4"
          >
            {isCameraOff ? (
              <VideoOff className="h-6 w-6" />
            ) : (
              <Video className="h-6 w-6" />
            )}
          </Button>

          <Button
            onClick={onScreenShare}
            variant="secondary"
            size="lg"
            className="rounded-full p-4"
          >
            <Share2 className="h-6 w-6" />
          </Button>

          <Button
            onClick={onEndCall}
            variant="danger"
            size="lg"
            className="rounded-full p-4 ml-4"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </div>
    );
  }

  // Default view
  return null;
};

// Setup Screen - Ask for permissions
const SetupScreen = ({ onReady, onCancel }) => {
  const localVideoRef = useRef(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Failed to get media devices:', error);
        setPermissionDenied(true);
        toast.error('Please allow camera and microphone access');
      }
    };

    setupMedia();

    return () => {
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Ready to Call?
          </h1>

          {!permissionDenied ? (
            <>
              <div className="mb-6 rounded-lg overflow-hidden bg-gray-900 aspect-video">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                Camera and microphone will be used for the call
              </p>

              <div className="flex gap-3">
                <Button
                  onClick={onCancel}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={onReady}
                  className="flex-1"
                >
                  Ready to Call
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 mb-4">
                Camera and microphone access is required to make calls.
              </p>
              <Button
                onClick={onCancel}
                variant="secondary"
                className="w-full"
              >
                Go Back
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const VideoCall = () => {
  const navigate = useNavigate();
  const { userId } = useParams(); // Call recipient ID
  const { user, isAuthenticated } = useAuthStore();
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [remoteUser, setRemoteUser] = useState(null);
  const [callDuration, setCallDuration] = useState('00:00');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callDurationInterval = useRef(null);
  const rtcPeerConnection = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // If userId is provided, initiate setup for call
    if (userId) {
      fetchUserInfo();
      setShowSetup(true);
    }
  }, [isAuthenticated, userId, navigate]);

  // Call duration timer
  useEffect(() => {
    if (callState === CALL_STATES.IN_CALL) {
      let seconds = 0;
      callDurationInterval.current = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        setCallDuration(
          `${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`
        );
      }, 1000);

      return () => {
        if (callDurationInterval.current) {
          clearInterval(callDurationInterval.current);
        }
      };
    }
  }, [callState]);

  const fetchUserInfo = async () => {
    try {
      const response = await api.get(`/users/${userId}`);
      setRemoteUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user info:', error);
      toast.error('Failed to load user information');
    }
  };

  const handleStartCall = async () => {
    try {
      setCallState(CALL_STATES.RINGING);

      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate call initiation
      // In production, this would use WebRTC signaling through websocket
      try {
        await api.post(`/calls/${userId}/initiate`);
      } catch (err) {
        console.log('Call signaling not yet implemented');
      }

      // Simulate receiving acceptance after 2-3 seconds
      setTimeout(() => {
        handleCallAccepted();
      }, 2500);
    } catch (error) {
      console.error('Failed to start call:', error);
      toast.error('Failed to start call. Please check your camera/microphone.');
      setCallState(CALL_STATES.IDLE);
    }
  };

  const handleCallAccepted = async () => {
    try {
      setCallState(CALL_STATES.IN_CALL);

      // In production, would set up WebRTC peer connection here
      // For now, simulate receiving a remote video
      if (remoteVideoRef.current) {
        // Create a canvas-based video to simulate remote video
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        // Draw a simple placeholder
        ctx.fillStyle = '#2D3748';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          remoteUser?.name || 'Remote User',
          canvas.width / 2,
          canvas.height / 2
        );

        // Get canvas stream
        const canvasStream = canvas.captureStream(30);
        remoteVideoRef.current.srcObject = canvasStream;
      }
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast.error('Failed to accept call');
    }
  };

  const handleEndCall = async () => {
    try {
      // Stop all tracks
      if (localVideoRef.current?.srcObject) {
        localVideoRef.current.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
      }

      if (remoteVideoRef.current?.srcObject) {
        remoteVideoRef.current.srcObject.getTracks().forEach((track) => {
          track.stop();
        });
      }

      // Notify backend
      if (userId) {
        try {
          await api.post(`/calls/${userId}/end`);
        } catch (err) {
          console.log('Call cleanup not yet implemented');
        }
      }

      setCallState(CALL_STATES.ENDED);
      setCallDuration('00:00');

      // Reset after 2 seconds
      setTimeout(() => {
        navigate('/chat');
      }, 2000);
    } catch (error) {
      console.error('Failed to end call:', error);
    }
  };

  const handleToggleMute = () => {
    if (localVideoRef.current?.srcObject) {
      const audioTracks = localVideoRef.current.srcObject.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
    }
    setIsMuted(!isMuted);
  };

  const handleToggleCamera = () => {
    if (localVideoRef.current?.srcObject) {
      const videoTracks = localVideoRef.current.srcObject.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = isCameraOff;
      });
    }
    setIsCameraOff(!isCameraOff);
  };

  const handleScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
      });

      // Replace video track
      if (localVideoRef.current?.srcObject) {
        const videoTrack = localVideoRef.current.srcObject
          .getVideoTracks()[0];
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace track in peer connection if it exists
        if (rtcPeerConnection.current) {
          const sender = rtcPeerConnection.current
            .getSenders()
            .find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        // Stop screen share when stopped
        screenTrack.onended = () => {
          handleScreenShare(); // Back to camera
        };

        toast.success('Screen sharing started');
      }
    } catch (error) {
      if (error.name !== 'NotAllowedError') {
        console.error('Failed to share screen:', error);
        toast.error('Failed to share screen');
      }
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/video-call/${user?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (showSetup && userId) {
    return (
      <SetupScreen
        onReady={handleStartCall}
        onCancel={() => navigate('/chat')}
      />
    );
  }

  if (callState !== CALL_STATES.IDLE) {
    return (
      <>
        <CallScreen
          callState={callState}
          remoteUser={remoteUser}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          callDuration={callDuration}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onEndCall={handleEndCall}
          onScreenShare={handleScreenShare}
        />

        <IncomingCallModal
          isOpen={!!incomingCall}
          caller={incomingCall}
          onAccept={() => {
            setIncomingCall(null);
            handleCallAccepted();
          }}
          onReject={() => setIncomingCall(null)}
        />
      </>
    );
  }

  // Idle state — show friends list to call
  return (
    <VideoCallHub user={user} navigate={navigate} copied={copied} onCopyLink={handleCopyLink} />
  );
};

// Hub page: pick a friend to call
const VideoCallHub = ({ user, navigate, copied, onCopyLink }) => {
  const [friends, setFriends] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadFriends = async () => {
      try {
        const res = await api.get('/users/friends');
        setFriends(res.data.friends || []);
      } catch (e) {
        console.error('Failed to load friends:', e);
      } finally {
        setLoading(false);
      }
    };
    loadFriends();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#4F7C82] rounded-xl flex items-center justify-center">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Video Calls</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Call your friends directly</p>
            </div>
          </div>

          {/* Your link */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Your call link</p>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate font-mono">
                {`${window.location.origin}/video-call/${user?.id}`}
              </span>
              <button onClick={onCopyLink} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Friends to call */}
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Call a friend
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No friends yet</p>
              <p className="text-sm mt-1">Add friends to start video calling</p>
              <Button onClick={() => navigate('/friends')} variant="outline" size="sm" className="mt-4">
                Find Friends
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => {
                const fid = friend.id || friend._id;
                const fname = friend.fullName || friend.name;
                return (
                  <div key={fid} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl hover:bg-[#B8E3E9]/20 transition">
                    <Avatar name={fname} size="md" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{fname}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{friend.course || 'Student'}</p>
                    </div>
                    <Button
                      onClick={() => navigate(`/video-call/${fid}`)}
                      size="sm"
                      className="bg-[#4F7C82] hover:bg-[#0B2E33] text-white gap-2"
                    >
                      <Video className="h-4 w-4" />
                      Call
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCall