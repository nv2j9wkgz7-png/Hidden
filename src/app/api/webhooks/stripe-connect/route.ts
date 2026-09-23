import { handler, HttpError, json } from '@/lib/http';
import { env } from '@/lib/env';
import { InvalidWebhook, StripeProvider } from '@/lib/payments/stripe';
import { paymentSucceeded } from '@/lib/payments/service';
export const runtime = 'nodejs';
export const POST = handler(async (request) => {
  const provider = new StripeProvider(
    env('STRIPE_SECRET_KEY'),
    env('STRIPE_CONNECT_WEBHOOK_SECRET'),
  );
  let event;
  try {
    event = await provider.verifyWebhook(await request.text(), request.headers);
  } catch (error) {
    if (error instanceof InvalidWebhook)
      throw new HttpError(400, 'Invalid webhook signature.');
    throw error;
  }
  if (event) {
    if (!event.stripeAccountId)
      throw new HttpError(400, 'Missing connected account.');
    await paymentSucceeded(provider.name, event);
  }
  return json({ received: true });
});
