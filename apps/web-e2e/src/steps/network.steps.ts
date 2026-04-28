import { Given } from '../fixtures/test';

Given('the API returns 500 for the projects list', async ({ page }) => {
  await page.route(
    (url) => url.pathname === '/projects' && url.port === '3000',
    async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 500, message: 'Internal Server Error', error: 'Server Error' }),
      });
    },
  );
});
