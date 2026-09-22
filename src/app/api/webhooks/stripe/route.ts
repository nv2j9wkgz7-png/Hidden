import { handler, HttpError, json } from '@/lib/http';
import { paymentProvider } from '@/lib/payments';
import { InvalidWebhook } from '@/lib/payments/stripe';
import { paymentSucceeded } from '@/lib/payments/service';
export const runtime = 'nodejs';
export const POST = handler(async (request) => {
  const provider = paymentProvider('stripe');
  let event;
  try {
    event = await provider.verifyWebhook(await request.text(), request.headers);
  } catch (error) {
    if (error instanceof InvalidWebhook)
      throw new HttpError(400, 'Invalid webhook signature.');
    throw error;
  }
  if (event) await paymentSucceeded(provider.name, event);
  return json({ received: true });
});
