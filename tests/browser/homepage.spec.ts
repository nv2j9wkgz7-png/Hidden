import { test, expect } from '@playwright/test';

test('homepage demos explain sharing and sales without changing real drops', async ({
  page,
}) => {
  const writes: string[] = [];
  page.on('request', (request) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method()))
      writes.push(request.url());
  });
  await page.goto('/');
  const dashboard = page.getByLabel('Illustrative creator sales dashboard');
  await expect(dashboard.getByText('$1,284', { exact: true })).toBeVisible();
  await dashboard.getByRole('button', { name: '30 days' }).click();
  await expect(dashboard.getByText('$4,872', { exact: true })).toBeVisible();
  await expect(dashboard.getByText('258', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stop sales', exact: true }).click();
  await expect(
    page.getByText('New sales are off.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Paid buyers keep their existing access.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Replay demo' }).click();
  await expect(
    page.getByText('Your link. Your call.', { exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

test('mobile social examples align after navigation and do not overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const examples = page.getByRole('group', { name: 'Sharing examples' });
  for (const [index, name] of ['iMessage', 'X bio', 'Kick bio'].entries()) {
    await examples.getByRole('button', { name, exact: true }).click();
    await expect
      .poll(() =>
        page.locator('.sharing-rail').evaluate((rail, i) => {
          const slide = rail.children[i] as HTMLElement;
          return Math.abs(
            slide.getBoundingClientRect().left -
              rail.getBoundingClientRect().left,
          );
        }, index),
      )
      .toBeLessThan(2);
    await expect(
      examples.getByRole('button', { name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
  }
  for (const width of [320, 390, 760, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test('motion can be paused and reduced motion shows all platform logos', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Pause platform logos' }).click();
  await expect(page.locator('.platform-track')).toHaveCSS(
    'animation-play-state',
    'paused',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.platform-track')).toHaveCSS(
    'animation-name',
    'none',
  );
  await page.setViewportSize({ width: 320, height: 844 });
  for (const name of ['Instagram', 'X', 'Kick', 'Twitch', 'YouTube']) {
    await expect(
      page
        .locator('.platform-set')
        .first()
        .getByRole('img', { name, exact: true }),
    ).toBeVisible();
  }
});
