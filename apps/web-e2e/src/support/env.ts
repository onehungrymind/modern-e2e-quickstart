export const E2E_WEB_BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';
export const E2E_API_BASE_URL = process.env['E2E_API_BASE_URL'] ?? 'http://localhost:3000';

export const E2E_PASSWORD = 'E2EPass1!';
export const E2E_PREFIX = 'E2E_';

export const ROLES = ['admin', 'alice', 'bob'] as const;
export type E2ERole = (typeof ROLES)[number];

export function storageStatePath(role: E2ERole): string {
  return `${__dirname}/../../.auth/${role}.json`;
}
