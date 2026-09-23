import { test, expect } from '@playwright/test';
test('home is responsive and offers the creator flow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      name: 'Your content. Your price.',
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
test('slow navigation keeps the current page and header visible', async ({
  page,
}) => {
  let release!: () => void;
  const responseGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/login*', async (route) => {
    if (route.request().headers()['rsc'] === '1') await responseGate;
    await route.continue();
  });
  await page.goto('/');
  const header = await page.locator('.site-header').elementHandle();
  try {
    await page.getByRole('link', { name: 'Log in', exact: true }).click();
    await expect(
      page.getByRole('progressbar', { name: 'Opening page' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Your content. Your price.' }),
    ).toBeVisible();
    await expect(page.getByText('Loading your workspace…')).toHaveCount(0);
  } finally {
    release();
  }
  await expect(
    page.getByRole('heading', {
      name: /Welcome back\.|Connect your workspace/,
    }),
  ).toBeVisible();
  expect(await header!.evaluate((element) => element.isConnected)).toBe(true);
  await expect(
    page.getByRole('progressbar', { name: 'Opening page' }),
  ).toHaveCount(0);
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
