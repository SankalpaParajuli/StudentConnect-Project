import { useEffect, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const { connectSocket, disconnectSocket, socket } = useChatStore();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return;
    }

    // Connect socket if not already connected
    if (!socket) {
      connectSocket(token);
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
      // Only disconnect when user logs out
    };
  }, [isAuthenticated, token, socket, connectSocket]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      // Optionally disconnect on page reload
      // disconnectSocket();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    socket,
    isConnected: socket?.connected || false,
  };
};
