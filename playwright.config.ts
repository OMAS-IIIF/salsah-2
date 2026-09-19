import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run build && npm run preview',
		port: 4173,
		env: { PUBLIC_API_URL: 'http://localhost:8000', PUBLIC_MEDIA_URL: 'http://media.test' }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
