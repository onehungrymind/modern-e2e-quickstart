import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  playwright.configs['flat/recommended'],
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    rules: {},
  },
  {
    // playwright-bdd step definitions wrap expect() in Given/When/Then
    // callbacks that the eslint plugin doesn't recognize as test blocks.
    files: ['src/steps/**/*.ts', 'src/pages/**/*.ts', 'src/support/**/*.ts', 'src/fixtures/**/*.ts'],
    rules: {
      'playwright/no-standalone-expect': 'off',
      'playwright/expect-expect': 'off',
      'playwright/missing-playwright-await': 'off',
    },
  },
];
