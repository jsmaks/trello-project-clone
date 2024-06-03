'use server';

import { auth } from '@clerk/nextjs/server';
import { InputType, ReturnType } from './types';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { createSafeAction } from '@/lib/create-safe-action';
import { CopyCard } from './schema';

import { createAuditLog } from '@/lib/create-audit-log';
import { ACTION, ENTITY_TYPE } from '@prisma/client';

const handler = async (data: InputType): Promise<ReturnType> => {
  const { userId, orgId } = auth();

  if (!userId || !orgId) {
    return {
      error: 'Unauthorized',
    };
  }
  const { id, boardId } = data;
  let card;

  try {
    const copyCard = await db.card.findUnique({
      where: {
        id: id,
        list: {
          board: {
            orgId: orgId,
          },
        },
      },
    });

    if (!copyCard) {
      return {
        error: 'Card not found',
      };
    }

    const lastCard = await db.card.findFirst({
      where: {
        listId: copyCard.listId,
      },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = lastCard ? lastCard.order + 1 : 1;

    card = await db.card.create({
      data: {
        title: `${copyCard.title} - copy`,
        description: copyCard.description,
        order: newOrder,
        listId: copyCard.listId,
      },
    });

    await createAuditLog({
      entityTitle: card.title,
      entityId: card.id,
      entityType: ENTITY_TYPE.CARD,
      action: ACTION.CREATE,
    });
  } catch (error) {
    return {
      error: 'Failed to copy',
    };
  }
  revalidatePath(`/board/${boardId}`);
  return { data: card };
};
export const copyCard = createSafeAction(CopyCard, handler);
