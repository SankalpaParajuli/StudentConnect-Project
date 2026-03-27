const prisma = require('../lib/prisma');
const { paginate, sanitizeUser } = require('../utils/helpers');
const { sendApprovalEmail } = require('../services/emailService');

exports.getDashboardStats = async (req, res) => {
  try {
    // Run each query independently so a missing model doesn't crash everything
    const safeCount = async (fn) => {
      try { return await fn(); } catch { return 0; }
    };

    const [
      totalUsers,
      pendingApprovals,
      approvedUsers,
      bannedUsers,
      totalResources,
      pendingResources,
      activeRooms,
      totalReports,
      pendingReports,
    ] = await Promise.all([
      safeCount(() => prisma.user.count()),
      safeCount(() => prisma.user.count({ where: { isApproved: false, role: 'STUDENT' } })),
      safeCount(() => prisma.user.count({ where: { isApproved: true } })),
      safeCount(() => prisma.user.count({ where: { isBanned: true } })),
      safeCount(() => prisma.resource.count()),
      safeCount(() => prisma.resource.count({ where: { status: 'PENDING' } })),
      safeCount(() => prisma.studyRoom.count({ where: { status: 'ACTIVE' } })),
      safeCount(() => prisma.report.count()),
      safeCount(() => prisma.report.count({ where: { status: 'PENDING' } })),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        approvedUsers,
        pendingApprovals,
        bannedUsers,
        totalResources,
        pendingResources,
        activeRooms,
        totalReports,
        pendingReports,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message,
    });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { search, role, isApproved, page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const sanitizedUsers = users.map((u) => sanitizeUser(u));

    res.json({
      success: true,
      users: sanitizedUsers,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message,
    });
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const approvedUser = await prisma.user.update({
      where: { id: userId },
      data: { isApproved: true },
    });

    await sendApprovalEmail(user.email, user.name);

    await prisma.notification.create({
      data: {
        userId,
        type: 'APPROVAL_STATUS',
        title: 'Account Approved',
        message: 'Your StudentConnect account has been approved!',
      },
    });

    res.json({
      success: true,
      message: 'User approved successfully',
      user: sanitizeUser(approvedUser),
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve user',
      error: error.message,
    });
  }
};

exports.banUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const bannedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, isOnline: false },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'ADMIN_NOTIFICATION',
        title: 'Account Banned',
        message: 'Your account has been banned from StudentConnect',
      },
    });

    res.json({
      success: true,
      message: 'User banned successfully',
      user: sanitizeUser(bannedUser),
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to ban user',
      error: error.message,
    });
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const unbannedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });

    await prisma.notification.create({
      data: {
        userId,
        type: 'ADMIN_NOTIFICATION',
        title: 'Account Unbanned',
        message: 'Your account has been unbanned from StudentConnect',
      },
    });

    res.json({
      success: true,
      message: 'User unbanned successfully',
      user: sanitizeUser(unbannedUser),
    });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unban user',
      error: error.message,
    });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.announcement.count(),
    ]);

    res.json({
      success: true,
      announcements,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get announcements',
      error: error.message,
    });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, priority } = req.body;
    const adminId = req.user.id;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        adminId,
        title,
        content,
        priority: priority || 'NORMAL',
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const allUsers = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of allUsers) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'ANNOUNCEMENT',
          title: announcement.title,
          message: content.substring(0, 100),
          relatedId: announcement.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement,
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message,
    });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found',
      });
    }

    if (announcement.adminId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this announcement',
      });
    }

    await prisma.announcement.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully',
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement',
      error: error.message,
    });
  }
};

exports.getPendingResources = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where: { status: 'PENDING' },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.resource.count({ where: { status: 'PENDING' } }),
    ]);

    res.json({
      success: true,
      resources,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get pending resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending resources',
      error: error.message,
    });
  }
};

exports.approveResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: true,
      },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const updatedResource = await prisma.resource.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: resource.uploaderId,
        type: 'RESOURCE_APPROVED',
        title: `Resource ${approved ? 'Approved' : 'Rejected'}`,
        message: `Your resource "${resource.title}" has been ${
          approved ? 'approved' : 'rejected'
        }`,
        relatedId: resource.id,
      },
    });

    res.json({
      success: true,
      message: `Resource ${approved ? 'approved' : 'rejected'} successfully`,
      resource: updatedResource,
    });
  } catch (error) {
    console.error('Approve resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve resource',
      error: error.message,
    });
  }
};

exports.approvePendingResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: true,
      },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const updatedResource = await prisma.resource.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: resource.uploaderId,
        type: 'RESOURCE_APPROVED',
        title: 'Resource Approved',
        message: `Your resource "${resource.title}" has been approved`,
        relatedId: resource.id,
      },
    });

    res.json({
      success: true,
      message: 'Resource approved successfully',
      resource: updatedResource,
    });
  } catch (error) {
    console.error('Approve pending resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve resource',
      error: error.message,
    });
  }
};

exports.rejectPendingResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: true,
      },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const updatedResource = await prisma.resource.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: resource.uploaderId,
        type: 'RESOURCE_APPROVED',
        title: 'Resource Rejected',
        message: `Your resource "${resource.title}" has been rejected`,
        relatedId: resource.id,
      },
    });

    res.json({
      success: true,
      message: 'Resource rejected successfully',
      resource: updatedResource,
    });
  } catch (error) {
    console.error('Reject pending resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject resource',
      error: error.message,
    });
  }
};

exports.getResources = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.resource.count({ where }),
    ]);

    res.json({
      success: true,
      resources,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resources',
      error: error.message,
    });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    await prisma.resource.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Resource deleted successfully',
    });
  } catch (error) {
    console.error('Delete resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete resource',
      error: error.message,
    });
  }
};

exports.getReports = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.report.count({ where }),
    ]);

    res.json({
      success: true,
      reports,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports',
      error: error.message,
    });
  }
};

exports.resolveReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    const resolvedReport = await prisma.report.update({
      where: { id },
      data: { status: 'RESOLVED' },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Report resolved successfully',
      report: resolvedReport,
    });
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve report',
      error: error.message,
    });
  }
};
