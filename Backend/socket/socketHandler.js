const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const onlineUsers = new Map();
// Random chat waiting queue: Map<socketId, { userId, name, course }>
const randomChatQueue = new Map();
// Active random chat pairs: Map<socketId, partnerSocketId>
const randomChatPairs = new Map();

const socketHandler = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    onlineUsers.set(userId, socket.id);

    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true, lastActive: new Date() },
    });

    io.emit('user:online', { userId, socketId: socket.id });

    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);
      onlineUsers.delete(userId);

      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false },
      });

      io.emit('user:offline', { userId });
    });

    socket.on('sendMessage', async (data) => {
      const { receiverId, content } = data;

      try {
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { requesterId: userId, receiverId, status: 'ACCEPTED' },
              { requesterId: receiverId, receiverId: userId, status: 'ACCEPTED' },
            ],
          },
        });

        const isMessageRequest = !friendship;

        const message = await prisma.message.create({
          data: {
            senderId: userId,
            receiverId,
            content,
            isRead: false,
            isMessageRequest,
            isApproved: !isMessageRequest,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        });

        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', message);
        }

        const notificationType = isMessageRequest ? 'MESSAGE_REQUEST' : 'MESSAGE';
        const notificationTitle = isMessageRequest ? 'New Message Request' : 'New Message';

        await prisma.notification.create({
          data: {
            userId: receiverId,
            type: notificationType,
            title: notificationTitle,
            message: `${message.sender.name} sent you a message`,
            relatedId: message.id,
          },
        });

        socket.emit('messageSent', { success: true, message });
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      const { receiverId } = data;
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user:typing', { userId });
      }
    });

    socket.on('stopTyping', (data) => {
      const { receiverId } = data;
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user:stopTyping', { userId });
      }
    });

    socket.on('callUser', (data) => {
      const { receiverId, signalData } = data;
      const receiverSocketId = onlineUsers.get(receiverId);

      if (receiverSocketId) {
        io.to(receiverSocketId).emit('callInitiated', {
          callerId: userId,
          signalData,
        });
      }
    });

    socket.on('answerCall', (data) => {
      const { callerId, signalData } = data;
      const callerSocketId = onlineUsers.get(callerId);

      if (callerSocketId) {
        io.to(callerSocketId).emit('callAnswered', {
          answererId: userId,
          signalData,
        });
      }
    });

    socket.on('iceCandidate', (data) => {
      const { recipientId, candidate } = data;
      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('iceCandidate', {
          senderId: userId,
          candidate,
        });
      }
    });

    socket.on('endCall', (data) => {
      const { recipientId } = data;
      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('callEnded', {
          callerId: userId,
        });
      }
    });

    socket.on('joinRoom', async (data) => {
      const { roomId } = data;
      socket.join(`room_${roomId}`);

      try {
        const room = await prisma.studyRoom.findUnique({
          where: { id: roomId },
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        });

        if (room) {
          io.to(`room_${roomId}`).emit('user:joinedRoom', {
            userId,
            participants: room.participants,
          });
        }
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });

    socket.on('leaveRoom', (data) => {
      const { roomId } = data;
      socket.leave(`room_${roomId}`);

      io.to(`room_${roomId}`).emit('user:leftRoom', { userId });
    });

    socket.on('roomMessage', (data) => {
      const { roomId, content } = data;

      io.to(`room_${roomId}`).emit('room:message', {
        userId,
        content,
        timestamp: new Date(),
      });
    });

    socket.on('notification', async (data) => {
      const { recipientId, type, title, message, relatedId } = data;

      try {
        const notification = await prisma.notification.create({
          data: {
            userId: recipientId,
            type,
            title,
            message,
            relatedId,
          },
        });

        const recipientSocketId = onlineUsers.get(recipientId);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receiveNotification', notification);
        }
      } catch (error) {
        console.error('Create notification error:', error);
        socket.emit('error', { message: 'Failed to send notification' });
      }
    });

    // ── Random Chat ──────────────────────────────────────────────
    socket.on('randomChat:join', async (data) => {
      // Don't join if already paired
      if (randomChatPairs.has(socket.id)) return;

      try {
        const userRecord = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, course: true, year: true },
        });

        // Check if there's someone in the queue (not ourselves)
        let matched = false;
        for (const [waitingSocketId, waitingUser] of randomChatQueue) {
          if (waitingSocketId !== socket.id && waitingUser.userId !== userId) {
            // Match found!
            randomChatQueue.delete(waitingSocketId);
            randomChatPairs.set(socket.id, waitingSocketId);
            randomChatPairs.set(waitingSocketId, socket.id);

            const partnerForCurrent = waitingUser;
            const partnerForWaiting = { userId, name: userRecord?.name || 'Student', course: userRecord?.course, year: userRecord?.year };

            io.to(socket.id).emit('randomChat:matched', { partner: partnerForCurrent });
            io.to(waitingSocketId).emit('randomChat:matched', { partner: partnerForWaiting });
            matched = true;
            break;
          }
        }

        if (!matched) {
          randomChatQueue.set(socket.id, {
            userId,
            name: userRecord?.name || 'Student',
            course: userRecord?.course,
            year: userRecord?.year,
          });
          socket.emit('randomChat:waiting');
        }
      } catch (error) {
        console.error('Random chat join error:', error);
      }
    });

    socket.on('randomChat:leave', () => {
      randomChatQueue.delete(socket.id);
      const partnerSocketId = randomChatPairs.get(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('randomChat:ended');
        randomChatPairs.delete(partnerSocketId);
      }
      randomChatPairs.delete(socket.id);
    });

    socket.on('randomChat:message', (data) => {
      const partnerSocketId = randomChatPairs.get(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('randomChat:message', {
          content: data.content,
          timestamp: new Date(),
        });
      }
    });

    // Clean up random chat on disconnect
    socket.on('disconnect', async () => {
      randomChatQueue.delete(socket.id);
      const partnerSocketId = randomChatPairs.get(socket.id);
      if (partnerSocketId) {
        io.to(partnerSocketId).emit('randomChat:ended');
        randomChatPairs.delete(partnerSocketId);
      }
      randomChatPairs.delete(socket.id);
    });
    // ─────────────────────────────────────────────────────────────
  });
};

module.exports = socketHandler;
