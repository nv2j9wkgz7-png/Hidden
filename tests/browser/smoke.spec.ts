import { test, expect } from '@playwright/test';
test('home is responsive and offers the creator flow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'Your images. One link. Paid & delivered.',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Create your first drop' }),
  ).toHaveAttribute('href', '/new');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Create your first drop' }).click();
  await expect(
    page.getByRole('heading', {
      name: /Connect your workspace|Welcome back\./,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test('unknown page is handled', async ({ page }) => {
  await page.goto('/missing-page');
  await expect(
    page.getByRole('heading', { name: 'This drop isn’t here.' }),
  ).toBeVisible();
});
test('API denies cross-origin checkout and downloads before contacting services', async ({
  request,
}) => {
  for (const path of [
    '/api/checkout',
    '/api/downloads',
    '/api/creator/drops',
  ]) {
    const response = await request.post(path, {
      headers: { Origin: 'https://untrusted.example' },
      data: {},
    });
    expect(response.status()).toBe(403);
  }
});
