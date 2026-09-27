import { expect, test } from '@playwright/test';
const headers = {
	'Access-Control-Allow-Origin': 'http://localhost:4173',
	'Access-Control-Allow-Credentials': 'true',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Content-Type': 'application/json'
};
test('password reset is public and sends no client-selected destination', async ({ page }) => {
	await page.route('http://localhost:8000/**', async (route) => {
		if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
		if (route.request().url().endsWith('/password-reset/confirm')) {
			expect(route.request().postDataJSON()).toEqual({
				token: 'test.reset.token',
				password: 'new password'
			});
			return route.fulfill({ headers, json: { message: 'Password updated' } });
		}
		return route.fulfill({ status: 401, headers, json: {} });
	});
	await page.goto('http://localhost:4173/password-reset?token=test.reset.token');
	await page.locator('input[type=password]').nth(0).fill('new password');
	await page.locator('input[type=password]').nth(1).fill('new password');
	await page.locator('form button').click();
	await expect(page.getByRole('status')).toHaveText('Password updated');
	await expect(page).toHaveURL(/password-reset/);
});
test('export deep link survives login and owner-protected loading', async ({ page }) => {
	let loggedIn = false;
	await page.route('http://localhost:8000/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
		if (path === '/admin/auth/refresh') return route.fulfill({ status: 401, headers, json: {} });
		if (path === '/admin/auth/researcher') {
			loggedIn = true;
			return route.fulfill({ headers, json: { accessToken: 'test-token' } });
		}
		if (path === '/admin/user/researcher')
			return route.fulfill({
				headers,
				json: {
					userIri: 'urn:uuid:researcher',
					userId: 'researcher',
					givenName: 'Ada',
					familyName: 'Archivist',
					isActive: true,
					inProjects: [],
					hasRole: {}
				}
			});
		if (path === '/exports/abc') {
			expect(loggedIn).toBeTruthy();
			expect(request.headers().authorization).toBe('Bearer test-token');
			return route.fulfill({
				headers,
				json: {
					exportId: 'abc',
					state: 'READY',
					canDownload: true,
					selection: { displayName: 'Chama media' }
				}
			});
		}
		return route.fulfill({ status: 404, headers, json: {} });
	});
	await page.goto('http://localhost:4173/exports/abc');
	await expect(page).toHaveURL(/login\?next=/);
	await page.locator('input[name=userId]').fill('researcher');
	await page.locator('input[name=password]').fill('secret');
	await page.locator('form button').click();
	await expect(page.getByRole('heading', { name: 'Chama media' })).toBeVisible();
	await expect(page).toHaveURL('http://localhost:4173/exports/abc');
});

test('import email opens the existing review after restored authentication', async ({ page }) => {
	await page.route('http://localhost:8000/**', async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
		if (path === '/admin/auth/refresh')
			return route.fulfill({
				headers,
				json: { accessToken: 'header.eyJzdWIiOiJyZXNlYXJjaGVyIn0.signature' }
			});
		if (path.startsWith('/admin/user/'))
			return route.fulfill({
				headers,
				json: {
					userIri: 'urn:uuid:researcher',
					userId: 'researcher',
					givenName: 'Ada',
					familyName: 'Archivist',
					isActive: true,
					inProjects: [],
					hasRole: {}
				}
			});
		if (path === '/imports/abc')
			return route.fulfill({
				headers,
				json: {
					importId: 'abc',
					state: 'IMPORTED',
					stateVersion: 3,
					createdAt: '2026-09-27T12:00:00Z',
					updatedAt: '2026-09-27T12:00:00Z',
					target: {
						projectShortName: 'chama',
						stagingAreaIri: 'chama:Staging',
						stagingAreaName: 'Staging',
						targetRootFolderIri: 'chama:Incoming',
						targetRootFolderName: 'Incoming'
					},
					originalFileName: 'chama-media.zip',
					declaredCompressedSizeBytes: 1000,
					reportAvailable: false,
					canConfirm: false,
					cleanupPending: false
				}
			});
		return route.fulfill({ status: 404, headers, json: {} });
	});
	await page.goto('http://localhost:4173/imports/abc');
	await expect(page.getByRole('status')).toContainText('abc');
	await expect(page.getByRole('status')).toContainText('Übernommen');
	await expect(page).toHaveURL('http://localhost:4173/imports/abc');
});
