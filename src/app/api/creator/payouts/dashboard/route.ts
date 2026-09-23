import { creator, handler, json, rateLimit, sameOrigin } from '@/lib/http';
import { payoutDashboard } from '@/lib/connect';
export const POST = handler(async (request) => {
  sameOrigin(request);
  const user = await creator();
  await rateLimit(`payout-dashboard:${user.id}`, 30);
  return json({ url: await payoutDashboard(user.id) });
});
