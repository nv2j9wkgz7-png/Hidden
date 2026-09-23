import { z } from 'zod';
import { creator, handler, json, rateLimit, sameOrigin } from '@/lib/http';
import { createOnboarding } from '@/lib/connect';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  await rateLimit(`payout-onboard:${user.id}`, 12);
  const { country } = z
    .object({ country: z.literal('US').optional() })
    .parse(await request.json());
  return json({ url: await createOnboarding(user, country) });
});
