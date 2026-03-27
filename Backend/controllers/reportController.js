const prisma = require('../lib/prisma');
const { sanitizeUser } = require('../utils/helpers');

exports.createReport = async (req, res) => {
  try {
    const { reportedUserId, reason, type } = req.body;
    const reporterId = req.user.id;

    if (!reportedUserId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Reported user ID and reason are required',
      });
    }

    if (reporterId === reportedUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot report yourself',
      });
    }

    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
    });

    if (!reportedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        reason,
        type: type || 'OTHER',
        status: 'PENDING',
      },
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
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isApproved: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'ADMIN_NOTIFICATION',
          title: 'New User Report',
          message: `${req.user.name} reported ${reportedUser.name} for: ${reason}`,
          relatedId: report.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report,
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create report',
      error: error.message,
    });
  }
};
