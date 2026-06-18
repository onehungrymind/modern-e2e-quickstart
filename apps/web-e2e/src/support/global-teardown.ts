import type { FullConfig } from '@playwright/test';
import { seed } from './seed';

export default async function globalTeardown(_config: FullConfig) {
  try {
    await seed.reset();
  } catch (err) {
    console.warn('[globalTeardown] /test/reset failed (api may be down):', err);
  }
}
