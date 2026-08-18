import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: { PUBLIC_API_URL: 'http://localhost:8000' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
