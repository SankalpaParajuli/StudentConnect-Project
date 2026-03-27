const prisma = require('../lib/prisma');

const checkAndAwardBadges = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!user) return;

    const badges = await prisma.badge.findMany();
    const userBadgeNames = user.badges.map((ub) => ub.badge.name);

    for (const badge of badges) {
      if (userBadgeNames.includes(badge.name)) continue;

      let shouldAward = false;

      try {
        switch (badge.requirementType) {
          case 'registration':
            shouldAward = true;
            break;

          case 'friends':
            const friendCount = await prisma.friendship.count({
              where: {
                OR: [{ requesterId: userId }, { receiverId: userId }],
                status: 'ACCEPTED',
              },
            });
            shouldAward = friendCount >= badge.requirementValue;
            break;

          case 'resources_shared':
            const resourceCount = await prisma.resource.count({
              where: { uploaderId: userId, status: 'APPROVED' },
            });
            shouldAward = resourceCount >= badge.requirementValue;
            break;

          case 'downloads':
            const userResources = await prisma.resource.findMany({
              where: { uploaderId: userId },
            });
            const totalDownloads = userResources.reduce(
              (sum, r) => sum + r.downloads,
              0
            );
            shouldAward = totalDownloads >= badge.requirementValue;
            break;

          case 'streak':
            shouldAward = user.streakDays >= badge.requirementValue;
            break;

          case 'videos_shared':
            const videoCount = await prisma.resource.count({
              where: {
                uploaderId: userId,
                category: 'VIDEOS',
                status: 'APPROVED',
              },
            });
            shouldAward = videoCount >= badge.requirementValue;
            break;

          case 'rooms_created':
            const roomCount = await prisma.studyRoom.count({
              where: { hostId: userId },
            });
            shouldAward = roomCount >= badge.requirementValue;
            break;

          case 'badge_points':
            shouldAward = user.badgePoints >= badge.requirementValue;
            break;

          default:
            break;
        }

        if (shouldAward) {
          await prisma.userBadge.create({
            data: {
              userId,
              badgeId: badge.id,
            },
          });

          await prisma.user.update({
            where: { id: userId },
            data: { badgePoints: { increment: 10 } },
          });
        }
      } catch (badgeError) {
        console.error(`Error processing badge ${badge.name}:`, badgeError.message);
      }
    }
  } catch (error) {
    console.error('Error checking and awarding badges:', error.message);
  }
};

const awardBadgeForAction = async (userId, badgeType) => {
  try {
    const badge = await prisma.badge.findFirst({
      where: { requirementType: badgeType },
    });

    if (!badge) return;

    const existingBadge = await prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId: badge.id,
        },
      },
    });

    if (!existingBadge) {
      await prisma.userBadge.create({
        data: {
          userId,
          badgeId: badge.id,
        },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { badgePoints: { increment: 10 } },
      });
    }
  } catch (error) {
    console.error('Error awarding badge for action:', error.message);
  }
};

module.exports = {
  checkAndAwardBadges,
  awardBadgeForAction,
};
