import { Given } from '../fixtures/test';

Given('the API returns 401 for authenticated requests', async ({ page }) => {
  await page.route(
    (url) => url.port === '3000',
    async (route) => {
      const hasBearer = route.request().headers()['authorization']?.startsWith('Bearer ');
      if (!hasBearer) return route.fallback();
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 401,
          message: 'Unauthorized',
          error: 'Unauthorized',
        }),
      });
    },
  );
});

Given(
  'the API takes {int}ms to return the projects list',
  async ({ page }, delayMs: number) => {
    await page.route(
      (url) => url.pathname === '/projects' && url.port === '3000',
      async (route) => {
        if (route.request().method() !== 'GET') return route.fallback();
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await route.continue();
      },
    );
  },
);

Given(
  'the API rejects POST requests to projects with a 400',
  async ({ page }) => {
    await page.route(
      (url) => url.pathname === '/projects' && url.port === '3000',
      async (route) => {
        if (route.request().method() !== 'POST') return route.fallback();
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 400,
            message: 'Validation failed',
            error: 'Bad Request',
          }),
        });
      },
    );
  },
);
