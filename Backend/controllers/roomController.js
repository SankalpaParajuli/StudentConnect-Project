const prisma = require('../lib/prisma');
const { paginate } = require('../utils/helpers');

exports.getRooms = async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {
      status: 'ACTIVE',
    };

    if (search) {
      where.OR = [{ name: { contains: search, mode: 'insensitive' } }];
    }

    const [rooms, total] = await Promise.all([
      prisma.studyRoom.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          participants: {
            select: { id: true, userId: true, role: true },
          },
        },
      }),
      prisma.studyRoom.count({ where }),
    ]);

    const formattedRooms = rooms.map((room) => ({
      ...room,
      participantCount: room.participants.length,
    }));

    res.json({
      success: true,
      rooms: formattedRooms,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get rooms',
      error: error.message,
    });
  }
};

exports.getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
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

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.json({
      success: true,
      room: {
        ...room,
        participantCount: room.participants.length,
      },
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room',
      error: error.message,
    });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const { name, description, isPublic, password, maxParticipants } = req.body;
    const hostId = req.user.id;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Room name is required',
      });
    }

    const room = await prisma.studyRoom.create({
      data: {
        hostId,
        name,
        description,
        isPublic: isPublic !== false,
        password: !isPublic ? password : null,
        maxParticipants: maxParticipants || 10,
        maxDuration: 120,
      },
    });

    await prisma.roomParticipant.create({
      data: {
        roomId: room.id,
        userId: hostId,
        role: 'HOST',
      },
    });

    // Fetch the full room with participants AFTER adding the host
    const fullRoom = await prisma.studyRoom.findUnique({
      where: { id: room.id },
      include: {
        host: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Study room created successfully',
      room: {
        ...fullRoom,
        participantCount: fullRoom.participants.length,
      },
    });
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create room',
      error: error.message,
    });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const userId = req.user.id;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    if (room.status === 'CLOSED') {
      return res.status(403).json({
        success: false,
        message: 'Room is closed',
      });
    }

    if (!room.isPublic && room.password !== password) {
      return res.status(403).json({
        success: false,
        message: 'Invalid password',
      });
    }

    if (room.participants.length >= room.maxParticipants) {
      return res.status(403).json({
        success: false,
        message: 'Room is full',
      });
    }

    const existingParticipant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (existingParticipant) {
      // Already a participant — just return the full room so the frontend can open it
      const existingRoom = await prisma.studyRoom.findUnique({
        where: { id: roomId },
        include: {
          host: { select: { id: true, name: true, avatarUrl: true } },
          participants: {
            include: {
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      });
      return res.json({
        success: true,
        message: 'You are already in this room',
        room: { ...existingRoom, participantCount: existingRoom.participants.length },
      });
    }

    const participant = await prisma.roomParticipant.create({
      data: {
        roomId,
        userId,
        role: 'PARTICIPANT',
      },
    });

    // Return the full room with participant data
    const updatedRoom = await prisma.studyRoom.findUnique({
      where: { id: roomId },
      include: {
        host: { select: { id: true, name: true, avatarUrl: true } },
        participants: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Successfully joined room',
      room: {
        ...updatedRoom,
        participantCount: updatedRoom.participants.length,
      },
    });
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room',
      error: error.message,
    });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Not in this room',
      });
    }

    await prisma.roomParticipant.delete({
      where: {
        roomId_userId: {
          roomId,
          userId,
        },
      },
    });

    const remainingParticipants = await prisma.roomParticipant.count({
      where: { roomId },
    });

    if (remainingParticipants === 0) {
      await prisma.studyRoom.update({
        where: { id: roomId },
        data: { status: 'CLOSED' },
      });
    }

    res.json({
      success: true,
      message: 'Successfully left room',
    });
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room',
      error: error.message,
    });
  }
};

exports.closeRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only host can close the room',
      });
    }

    const closedRoom = await prisma.studyRoom.update({
      where: { id: roomId },
      data: { status: 'CLOSED' },
    });

    res.json({
      success: true,
      message: 'Room closed successfully',
      room: closedRoom,
    });
  } catch (error) {
    console.error('Close room error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close room',
      error: error.message,
    });
  }
};

exports.kickParticipant = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const userId = req.user.id;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only host can kick participants',
      });
    }

    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: participantId,
        },
      },
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    await prisma.roomParticipant.delete({
      where: {
        roomId_userId: {
          roomId,
          userId: participantId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Participant removed from room',
    });
  } catch (error) {
    console.error('Kick participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to kick participant',
      error: error.message,
    });
  }
};

exports.getRoomParticipants = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    res.json({
      success: true,
      participants: room.participants,
    });
  } catch (error) {
    console.error('Get room participants error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get participants',
      error: error.message,
    });
  }
};

exports.toggleMute = async (req, res) => {
  try {
    const { roomId, participantId } = req.params;
    const userId = req.user.id;

    const room = await prisma.studyRoom.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found',
      });
    }

    if (room.hostId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Only host can mute participants',
      });
    }

    const participant = await prisma.roomParticipant.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId: participantId,
        },
      },
    });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found',
      });
    }

    const updatedParticipant = await prisma.roomParticipant.update({
      where: {
        roomId_userId: {
          roomId,
          userId: participantId,
        },
      },
      data: { isMuted: !participant.isMuted },
    });

    res.json({
      success: true,
      message: `Participant ${updatedParticipant.isMuted ? 'muted' : 'unmuted'}`,
      participant: updatedParticipant,
    });
  } catch (error) {
    console.error('Toggle mute error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle mute',
      error: error.message,
    });
  }
};
