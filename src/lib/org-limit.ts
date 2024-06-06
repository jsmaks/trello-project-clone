import { auth } from '@clerk/nextjs/server';
import { db } from './db';
import { MAX_FREE_BOARDS } from '@/constants/board';

export const incrementAvailableCount = async () => {
  const { orgId } = auth();
  if (!orgId) {
    throw new Error('Unauthorized');
  }

  const orgLimit = await db.orgLimit.findUnique({
    where: { orgId: orgId },
  });

  if (orgLimit) {
    await db.orgLimit.update({
      where: { orgId: orgId },
      data: { count: orgLimit.count + 1 },
    });
  } else {
    await db.orgLimit.create({
      data: { orgId: orgId, count: 1 },
    });
  }
};

export const decreseAvailableCount = async () => {
  const { orgId } = auth();
  if (!orgId) {
    throw new Error('Unauthorized');
  }

  const orgLimit = await db.orgLimit.findUnique({
    where: { orgId: orgId },
  });

  if (orgLimit) {
    await db.orgLimit.update({
      where: { orgId: orgId },
      data: { count: orgLimit.count > 0 ? orgLimit.count - 1 : 0 },
    });
  } else {
    await db.orgLimit.create({
      data: { orgId: orgId, count: 1 },
    });
  }
};

export const hasAvailableCount = async () => {
  const { orgId } = auth();

  if (!orgId) {
    throw new Error('Unauthorized');
  }

  const orgLimit = await db.orgLimit.findUnique({ where: { orgId: orgId } });

  if (!orgLimit || orgLimit.count < MAX_FREE_BOARDS) {
    return true;
  } else {
    return false;
  }
};

export const getAvailableCount = async () => {
  const { orgId } = auth();

  if (!orgId) {
    return 0;
  }
  const orgLimit = await db.orgLimit.findUnique({ where: { orgId: orgId } });

  if (!orgLimit) {
    return 0;
  } else {
    return orgLimit.count;
  }
};