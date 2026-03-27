const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');
const { paginate } = require('../utils/helpers');
const { checkAndAwardBadges } = require('../services/badgeService');

// Upload file: use Cloudinary if configured, otherwise save to local disk
const uploadFileAny = async (buffer, fileName, mimetype) => {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();

  if (cloudName && cloudName.length > 0) {
    const { uploadFile } = require('../services/cloudinaryService');
    return await uploadFile(buffer, fileName, 'studentconnect/resources');
  }

  // Fallback: save to local uploads/resources directory
  const uploadsDir = path.join(__dirname, '../../uploads/resources');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const ext = mimetype ? '.' + mimetype.split('/')[1] : '';
  const localFileName = `${fileName}${ext}`;
  const filePath = path.join(uploadsDir, localFileName);
  fs.writeFileSync(filePath, buffer);

  const serverBase = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  return {
    secure_url: `${serverBase}/uploads/resources/${localFileName}`,
    public_id: `local_resources/${localFileName}`,
  };
};

const deleteFileAny = async (publicId) => {
  if (publicId && publicId.startsWith('local_resources/')) {
    const localFileName = publicId.replace('local_resources/', '');
    const filePath = path.join(__dirname, '../../uploads/resources', localFileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { result: 'ok' };
  }
  const { deleteFile } = require('../services/cloudinaryService');
  return await deleteFile(publicId);
};

// Map human-readable category names to Prisma enum values
const normalizeCategory = (cat) => {
  if (!cat) return null;
  const map = {
    'notes': 'NOTES',
    'past papers': 'PAST_PAPERS',
    'past_papers': 'PAST_PAPERS',
    'assignments': 'ASSIGNMENTS',
    'books': 'BOOKS',
    'videos': 'VIDEOS',
    'other': 'OTHER',
    'notes': 'NOTES',
  };
  // Already uppercase enum values pass through unchanged
  const valid = ['NOTES','PAST_PAPERS','ASSIGNMENTS','BOOKS','VIDEOS','OTHER'];
  if (valid.includes(cat)) return cat;
  return map[cat.toLowerCase()] || 'OTHER';
};

exports.getResources = async (req, res) => {
  try {
    const { category, branch, year, search, status, page, limit, mine } = req.query;
    const { skip, take } = paginate(page, limit);

    const where = {};

    if (mine === 'true') {
      // Return the authenticated user's own uploads regardless of status
      where.uploaderId = req.user.id;
    } else {
      // Public listing: approved resources only (or filter by explicit status)
      where.status = status || 'APPROVED';
    }

    if (category) {
      where.category = normalizeCategory(category);
    }

    if (branch) {
      where.branch = branch;
    }

    if (year) {
      where.year = parseInt(year);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
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
              avatarUrl: true,
            },
          },
          ratings: {
            select: { rating: true },
          },
        },
      }),
      prisma.resource.count({ where }),
    ]);

    const formattedResources = resources.map((resource) => ({
      ...resource,
      averageRating:
        resource.ratings.length > 0
          ? (
              resource.ratings.reduce((sum, r) => sum + r.rating, 0) /
              resource.ratings.length
            ).toFixed(2)
          : null,
      ratingCount: resource.ratings.length,
    }));

    res.json({
      success: true,
      resources: formattedResources,
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

exports.getResourceById = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            course: true,
          },
        },
        ratings: {
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

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    if (resource.status !== 'APPROVED' && resource.uploaderId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Resource not available',
      });
    }

    const averageRating =
      resource.ratings.length > 0
        ? (
            resource.ratings.reduce((sum, r) => sum + r.rating, 0) /
            resource.ratings.length
          ).toFixed(2)
        : null;

    res.json({
      success: true,
      resource: {
        ...resource,
        averageRating,
        ratingCount: resource.ratings.length,
      },
    });
  } catch (error) {
    console.error('Get resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get resource',
      error: error.message,
    });
  }
};

exports.uploadResource = async (req, res) => {
  try {
    const { title, description, category, branch, year } = req.body;
    const uploaderId = req.user.id;

    if (!title || !category || !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Title, category, and file are required',
      });
    }

    const uploadResult = await uploadFileAny(
      req.file.buffer,
      `resource_${Date.now()}_${uploaderId}`,
      req.file.mimetype
    );

    const resource = await prisma.resource.create({
      data: {
        uploaderId,
        title,
        description,
        category: normalizeCategory(category),
        branch,
        year: year ? parseInt(year) : null,
        fileUrl: uploadResult.secure_url,
        filePublicId: uploadResult.public_id,
        fileType: req.file.mimetype,
        status: 'PENDING',
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
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
          title: 'New Resource for Review',
          message: `New ${category} resource "${title}" pending approval`,
          relatedId: resource.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully, pending admin approval',
      resource,
    });
  } catch (error) {
    console.error('Upload resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload resource',
      error: error.message,
    });
  }
};

exports.rateResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    const existingRating = await prisma.resourceRating.findUnique({
      where: {
        resourceId_userId: {
          resourceId: id,
          userId,
        },
      },
    });

    let resourceRating;

    if (existingRating) {
      resourceRating = await prisma.resourceRating.update({
        where: {
          resourceId_userId: {
            resourceId: id,
            userId,
          },
        },
        data: {
          rating: parseInt(rating),
          comment,
        },
      });
    } else {
      resourceRating = await prisma.resourceRating.create({
        data: {
          resourceId: id,
          userId,
          rating: parseInt(rating),
          comment,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      rating: resourceRating,
    });
  } catch (error) {
    console.error('Rate resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to rate resource',
      error: error.message,
    });
  }
};

exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found',
      });
    }

    if (resource.uploaderId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this resource',
      });
    }

    await deleteFileAny(resource.filePublicId);

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

exports.downloadResource = async (req, res) => {
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

    if (resource.status !== 'APPROVED') {
      return res.status(403).json({
        success: false,
        message: 'Resource not available',
      });
    }

    await prisma.resource.update({
      where: { id },
      data: {
        downloads: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: 'Download recorded',
      fileUrl: resource.fileUrl,
    });
  } catch (error) {
    console.error('Download resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download resource',
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

    if (approved) {
      await checkAndAwardBadges(resource.uploaderId);
    }

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
