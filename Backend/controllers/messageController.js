const prisma = require('../lib/prisma');
const { paginate, sanitizeUser } = require('../utils/helpers');

exports.getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const conversations = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      distinct: ['senderId', 'receiverId'],
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            isOnline: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            isOnline: true,
          },
        },
      },
    });

    const formattedConversations = conversations.map((msg) => ({
      ...msg,
      otherUser:
        msg.senderId === userId
          ? sanitizeUser(msg.receiver)
          : sanitizeUser(msg.sender),
    }));

    res.json({
      success: true,
      conversations: formattedConversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page, limit } = req.query;
    const { skip, take } = paginate(page, limit);
    const currentUserId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
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

    const total = await prisma.message.count({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
    });

    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: currentUserId,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      messages: messages.reverse(),
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { userId } = req.params;
    const { content } = req.body;
    const senderId = req.user.id;

    if (!userId || !content) {
      return res.status(400).json({
        success: false,
        message: 'User ID and content are required',
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found',
      });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: senderId, receiverId: userId, status: 'ACCEPTED' },
          { requesterId: userId, receiverId: senderId, status: 'ACCEPTED' },
        ],
      },
    });

    const isMessageRequest = !friendship;

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId: userId,
        content,
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

    if (isMessageRequest) {
      await prisma.notification.create({
        data: {
          userId,
          type: 'MESSAGE_REQUEST',
          title: 'New Message Request',
          message: `${req.user.name} sent you a message request`,
          relatedId: message.id,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId,
          type: 'MESSAGE_REQUEST',
          title: 'New Message',
          message: `${req.user.name} sent you a message`,
          relatedId: message.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message,
    });
  }
};

exports.approveMessageRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        senderId: requesterId,
        receiverId: userId,
        isMessageRequest: true,
      },
    });

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message request not found',
      });
    }

    const updatedMessages = await prisma.message.updateMany({
      where: {
        senderId: requesterId,
        receiverId: userId,
        isMessageRequest: true,
      },
      data: {
        isApproved: true,
        isMessageRequest: false,
      },
    });

    res.json({
      success: true,
      message: 'Message request approved',
      updated: updatedMessages.count,
    });
  } catch (error) {
    console.error('Approve message request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve message request',
      error: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message,
    });
  }
};

exports.getMessageRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const [requests, total] = await Promise.all([
      prisma.message.findMany({
        where: {
          receiverId: userId,
          isMessageRequest: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              course: true,
            },
          },
        },
      }),
      prisma.message.count({
        where: {
          receiverId: userId,
          isMessageRequest: true,
        },
      }),
    ]);

    res.json({
      success: true,
      requests,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get message requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message requests',
      error: error.message,
    });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    if (message.senderId !== userId && message.receiverId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message,
    });
  }
};

exports.declineMessageRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user.id;

    const messages = await prisma.message.findMany({
      where: {
        senderId: requesterId,
        receiverId: userId,
        isMessageRequest: true,
      },
    });

    if (messages.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Message request not found',
      });
    }

    await prisma.message.deleteMany({
      where: {
        senderId: requesterId,
        receiverId: userId,
        isMessageRequest: true,
      },
    });

    res.json({
      success: true,
      message: 'Message request declined',
    });
  } catch (error) {
    console.error('Decline message request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline message request',
      error: error.message,
    });
  }
};
