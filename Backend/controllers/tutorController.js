const prisma = require('../lib/prisma');
const { paginate } = require('../utils/helpers');

exports.getTutors = async (req, res) => {
  try {
    const { subject, page, limit } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {
      status: 'APPROVED',
    };

    if (subject) {
      where.subjects = {
        hasSome: [subject],
      };
    }

    const [tutors, total] = await Promise.all([
      prisma.tutorProfile.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
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
      prisma.tutorProfile.count({ where }),
    ]);

    res.json({
      success: true,
      tutors,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get tutors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tutors',
      error: error.message,
    });
  }
};

exports.getMyTutorProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            course: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found',
      });
    }

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Get tutor profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tutor profile',
      error: error.message,
    });
  }
};

exports.applyAsTutor = async (req, res) => {
  try {
    const { subjects, grades, experience } = req.body;
    const userId = req.user.id;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one subject is required',
      });
    }

    const existingProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied as a tutor',
      });
    }

    const tutorProfile = await prisma.tutorProfile.create({
      data: {
        userId,
        subjects,
        grades: grades || [],
        experience,
        status: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'APPROVAL_STATUS',
          title: 'New Tutor Application',
          message: `${tutorProfile.user.name} has applied as a tutor`,
          relatedId: tutorProfile.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Tutor application submitted successfully',
      profile: tutorProfile,
    });
  } catch (error) {
    console.error('Apply as tutor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply as tutor',
      error: error.message,
    });
  }
};

exports.approveTutor = async (req, res) => {
  try {
    const { tutorId } = req.params;

    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
      include: {
        user: true,
      },
    });

    if (!tutorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Tutor profile not found',
      });
    }

    const updatedProfile = await prisma.tutorProfile.update({
      where: { id: tutorId },
      data: { status: 'APPROVED' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: tutorProfile.userId,
        type: 'APPROVAL_STATUS',
        title: 'Tutor Application Approved',
        message: 'Your tutor application has been approved!',
        relatedId: tutorId,
      },
    });

    res.json({
      success: true,
      message: 'Tutor approved successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Approve tutor error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve tutor',
      error: error.message,
    });
  }
};

exports.getTutorSessions = async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const { skip, take } = paginate(page, limit);
    const userId = req.user.id;

    const where = {
      OR: [{ tutorId: userId }, { studentId: userId }],
    };

    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      prisma.tutorSession.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          tutor: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.tutorSession.count({ where }),
    ]);

    res.json({
      success: true,
      sessions,
      total,
      pages: Math.ceil(total / (parseInt(limit) || 10)),
    });
  } catch (error) {
    console.error('Get tutor sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get sessions',
      error: error.message,
    });
  }
};

exports.requestTutorSession = async (req, res) => {
  try {
    const { tutorId, subject } = req.body;
    const studentId = req.user.id;

    if (!tutorId || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Tutor ID and subject are required',
      });
    }

    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
    });

    if (!tutor) {
      return res.status(404).json({
        success: false,
        message: 'Tutor not found',
      });
    }

    const session = await prisma.tutorSession.create({
      data: {
        tutorId: tutor.userId,
        studentId,
        subject,
        status: 'REQUESTED',
      },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: tutor.userId,
        type: 'SESSION_REQUEST',
        title: 'New Tutoring Session Request',
        message: `${session.student.name} requested a tutoring session in ${subject}`,
        relatedId: session.id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Session request sent successfully',
      session,
    });
  } catch (error) {
    console.error('Request session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to request session',
      error: error.message,
    });
  }
};

exports.respondToTutorSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { accepted } = req.body;

    const session = await prisma.tutorSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
      },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.tutorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const updatedSession = await prisma.tutorSession.update({
      where: { id: sessionId },
      data: {
        status: accepted ? 'ACCEPTED' : 'CANCELLED',
      },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
          },
        },
        student: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.studentId,
        type: 'SESSION_REQUEST',
        title: `Session ${accepted ? 'Accepted' : 'Declined'}`,
        message: `${updatedSession.tutor.name} has ${
          accepted ? 'accepted' : 'declined'
        } your session request`,
        relatedId: sessionId,
      },
    });

    res.json({
      success: true,
      message: `Session ${accepted ? 'accepted' : 'declined'}`,
      session: updatedSession,
    });
  } catch (error) {
    console.error('Update session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update session status',
      error: error.message,
    });
  }
};

exports.completeTutorSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { rating, feedback } = req.body;

    const session = await prisma.tutorSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.studentId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the student can rate the session',
      });
    }

    const completedSession = await prisma.tutorSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        rating: rating ? parseInt(rating) : null,
        feedback,
      },
      include: {
        tutor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: session.tutorId,
        type: 'SESSION_COMPLETED',
        title: 'Session Completed and Rated',
        message: 'A tutoring session has been completed and rated',
        relatedId: sessionId,
      },
    });

    res.json({
      success: true,
      message: 'Session completed and rated',
      session: completedSession,
    });
  } catch (error) {
    console.error('Rate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate session',
      error: error.message,
    });
  }
};
