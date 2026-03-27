const prisma = require('../lib/prisma');
const qrcode = require('qrcode');
const { sanitizeUser, paginate } = require('../utils/helpers');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');
const { checkAndAwardBadges } = require('../services/badgeService');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.params.id || req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: {
          include: {
            badge: true,
          },
        },
        uploadedResources: {
          where: { status: 'APPROVED' },
          select: { id: true, title: true },
        },
        hostedRooms: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isApproved && user.id !== req.user.id) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, course, year } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (name) updateData.name = name;
    if (bio) updateData.bio = bio;
    if (course) updateData.course = course;
    if (year) updateData.year = parseInt(year);

    if (req.file) {
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (user.avatarPublicId) {
        await deleteImage(user.avatarPublicId);
      }

      const uploadResult = await uploadImage(
        req.file.buffer,
        `avatar_${userId}`
      );
      updateData.avatarUrl = uploadResult.secure_url;
      updateData.avatarPublicId = uploadResult.public_id;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: sanitizeUser(updatedUser),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};

exports.searchUsers = async (req, res) => {
  try {
    const { search, q, page, limit } = req.query;
    const { skip, take } = paginate(page, limit);
    const searchTerm = search || q;

    if (!searchTerm || searchTerm.length < 2) {
      return res.json({
        success: true,
        users: [],
      });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          {
            isApproved: true,
            isBanned: false,
            role: 'STUDENT',
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        course: true,
        year: true,
        isOnline: true,
      },
      skip,
      take,
    });

    // Add fullName alias for frontend compatibility
    const usersWithAlias = users.map(u => ({ ...u, fullName: u.name }));

    res.json({
      success: true,
      users: usersWithAlias,
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message,
    });
  }
};

exports.getUserBadges = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      badgePoints: user.badgePoints,
      badges: user.badges.map((ub) => ub.badge),
    });
  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get badges',
      error: error.message,
    });
  }
};

exports.generateQRCode = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const profileUrl = `${process.env.CLIENT_URL}/profile/${user.id}`;
    const qrCodeDataUrl = await qrcode.toDataURL(profileUrl);

    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      profileUrl,
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code',
      error: error.message,
    });
  }
};

exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;

    const friends = await prisma.friendship.findMany({
      where: {
        AND: [
          {
            OR: [{ requesterId: userId }, { receiverId: userId }],
          },
          { status: 'ACCEPTED' },
        ],
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            course: true,
            year: true,
            isOnline: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            course: true,
            year: true,
            isOnline: true,
          },
        },
      },
    });

    const friendList = friends.map((f) => {
      const friend = f.requesterId === userId ? f.receiver : f.requester;
      return {
        ...sanitizeUser(friend),
        fullName: friend.name,  // alias for frontend compatibility
      };
    });

    res.json({
      success: true,
      friends: friendList,
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friends',
      error: error.message,
    });
  }
};

exports.getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    let where = {};

    if (type === 'incoming') {
      where = { receiverId: userId, status: 'PENDING' };
    } else if (type === 'sent') {
      where = { requesterId: userId, status: 'PENDING' };
    } else {
      where = {
        OR: [
          { receiverId: userId, status: 'PENDING' },
          { requesterId: userId, status: 'PENDING' },
        ],
      };
    }

    const requests = await prisma.friendship.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            course: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            course: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normalize to flat user objects matching Friends.jsx expectations
    const normalizedRequests = requests.map((r) => {
      const isIncoming = r.receiverId === userId;
      const otherUser = isIncoming ? r.requester : r.receiver;
      return {
        id: r.id,           // friendship id (used for accept/decline)
        requestId: r.id,
        userId: otherUser.id,
        name: otherUser.name,
        fullName: otherUser.name,  // alias for frontend compatibility
        email: otherUser.email,
        avatarUrl: otherUser.avatarUrl,
        course: otherUser.course,
        requesterId: r.requesterId,
        receiverId: r.receiverId,
        status: r.status,
        createdAt: r.createdAt,
      };
    });

    res.json({
      success: true,
      requests: normalizedRequests,
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friend requests',
      error: error.message,
    });
  }
};

exports.sendFriendRequest = async (req, res) => {
  try {
    const { receiverId } = req.body;
    const requesterId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required',
      });
    }

    if (requesterId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself',
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const existingRequest = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId },
          { requesterId: receiverId, receiverId: requesterId },
        ],
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already exists',
      });
    }

    const friendRequest = await prisma.friendship.create({
      data: {
        requesterId,
        receiverId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: 'FRIEND_REQUEST',
        title: 'New Friend Request',
        message: `${req.user.name} sent you a friend request`,
        relatedId: friendRequest.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      request: friendRequest,
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send friend request',
      error: error.message,
    });
  }
};

exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user.id;

    const request = await prisma.friendship.findFirst({
      where: {
        requesterId,
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found',
      });
    }

    const acceptedRequest = await prisma.friendship.update({
      where: { id: request.id },
      data: { status: 'ACCEPTED' },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: requesterId,
        type: 'FRIEND_REQUEST',
        title: 'Friend Request Accepted',
        message: `${req.user.name} accepted your friend request`,
        relatedId: acceptedRequest.id,
      },
    });

    res.json({
      success: true,
      message: 'Friend request accepted',
      request: acceptedRequest,
    });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept friend request',
      error: error.message,
    });
  }
};

exports.declineFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.params;
    const userId = req.user.id;

    const request = await prisma.friendship.findFirst({
      where: {
        requesterId,
        receiverId: userId,
        status: 'PENDING',
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found',
      });
    }

    await prisma.friendship.delete({
      where: { id: request.id },
    });

    res.json({
      success: true,
      message: 'Friend request declined',
    });
  } catch (error) {
    console.error('Decline friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to decline friend request',
      error: error.message,
    });
  }
};

exports.deleteFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;

    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, receiverId: friendId, status: 'ACCEPTED' },
          { requesterId: friendId, receiverId: userId, status: 'ACCEPTED' },
        ],
      },
    });

    if (!friendship) {
      return res.status(404).json({
        success: false,
        message: 'Friendship not found',
      });
    }

    await prisma.friendship.delete({
      where: { id: friendship.id },
    });

    res.json({
      success: true,
      message: 'Friend removed successfully',
    });
  } catch (error) {
    console.error('Delete friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete friend',
      error: error.message,
    });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        course: true,
        year: true,
        bio: true,
        avatarUrl: true,
        isOnline: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Return with frontend-expected field names (defaults since these aren't in DB yet)
    res.json({
      success: true,
      settings: {
        ...user,
        notificationsEnabled: true,
        emailNotifications: true,
        isPublic: true,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings',
      error: error.message,
    });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { name, bio, course, year } = req.body;
    const userId = req.user.id;

    // Only update fields that actually exist in the Prisma schema
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (course !== undefined) updateData.course = course;
    if (year !== undefined) updateData.year = parseInt(year);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        course: true,
        year: true,
        bio: true,
        avatarUrl: true,
        emailVerified: true,
      },
    });

    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        ...updatedUser,
        notificationsEnabled: true,
        emailNotifications: true,
        isPublic: true,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message,
    });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message,
    });
  }
};

exports.addFriend = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    if (requesterId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself',
      });
    }

    const receiver = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const existingRequest = await prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: userId },
          { requesterId: userId, receiverId: requesterId },
        ],
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already exists',
      });
    }

    const friendRequest = await prisma.friendship.create({
      data: {
        requesterId,
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'FRIEND_REQUEST',
        title: 'New Friend Request',
        message: `${req.user.name} sent you a friend request`,
        relatedId: friendRequest.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      request: friendRequest,
    });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add friend',
      error: error.message,
    });
  }
};
