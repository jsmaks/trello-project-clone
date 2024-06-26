'use server';

import { db } from '@/lib/db';

import { InputType, ReturnType } from './types';
import { createSafeAction } from '@/lib/create-safe-action';

import { revalidatePath } from 'next/cache';
import { auth, currentUser } from '@clerk/nextjs/server';

import { StripeRedirect } from './schema';
import { absoluteUrl } from '@/lib/utils';
import { stripe } from '@/lib/stripe';
//eslint-disable-next-line
const handler = async (data: InputType): Promise<ReturnType> => {
  const { userId, orgId } = auth();
  const user = await currentUser();

  if (!userId || !orgId || !user) {
    return {
      error: 'Unauthorized',
    };
  }

  const settingUrl = absoluteUrl(`/organization/${orgId}`);

  let url = '';
  try {
    const orgSubscription = await db.orgSubscription.findUnique({
      where: {
        orgId: orgId,
      },
    });

    if (orgSubscription && orgSubscription.stripeCustomerId) {
      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: orgSubscription.stripeCustomerId,
        return_url: settingUrl,
      });
      url = stripeSession.url;
    } else {
      const stripeSession = await stripe.checkout.sessions.create({
        success_url: settingUrl,
        cancel_url: settingUrl,
        payment_method_types: ['card'],
        mode: 'subscription',
        billing_address_collection: 'auto',
        customer_email: user.emailAddresses[0].emailAddress,
        line_items: [
          {
            price_data: {
              currency: 'USD',
              product_data: {
                name: 'Taskify Pro',
                description: 'Unlimited boards for your organization',
              },
              unit_amount: 2000,
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          orgId: orgId,
        },
      });
      url = stripeSession.url || '';
    }
  } catch {
    return {
      error: 'Something went wrong. Please try again later.',
    };
  }
  revalidatePath(`/organization/${orgId}`);
  return { data: url };
};
export const stripeRedirect = createSafeAction(StripeRedirect, handler);
