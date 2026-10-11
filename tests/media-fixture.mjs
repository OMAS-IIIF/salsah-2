/** Manual/browser-tool smoke fixture for the actual Svelte viewer and API client.
 * Public fixture credentials only. Uses six-second signed capabilities, validates
 * every image request, and exposes credential-free counters at /stats. Ctrl-C
 * stops both loopback servers and removes the temporary Vite root.
 */
import { createServer as createHttpServer } from 'node:http';
import { createHmac } from 'node:crypto';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
const stats = { issued: 0, info: 0, tiles: 0, denied: 0, missing: 0, assets: [], users: [] };
let denied = false;
const key = 'public-fixture-key-never-used-in-production';
const sign = (body) => createHmac('sha256', key).update(body).digest('base64url');
const issue = (id) => {
	const body =
		Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url') +
		'.' +
		Buffer.from(
			JSON.stringify({
				typ: 'media',
				id,
				exp: Math.floor(Date.now() / 1000) + 6,
				jti: ++stats.issued
			})
		).toString('base64url');
	return body + '.' + sign(body);
};
const png = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
	'base64'
);
let apiOrigin;
const api = createHttpServer((req, res) => {
	res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept');
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Cache-Control', 'no-store');
	const reply = (status, data) => {
		res.writeHead(status, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(data));
	};
	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}
	if (req.url === '/stats') {
		reply(200, stats);
		return;
	}
	if (req.url === '/deny' && req.method === 'POST') {
		denied = true;
		reply(200, {});
		return;
	}
	const media = /^\/data\/mediaobject\/id\/(a|b)$/.exec(req.url);
	if (media) {
		stats.users.push(
			req.headers.authorization === 'Bearer fixture-access-editor' ? 'editor' : 'unknown'
		);
		if (denied) {
			stats.denied++;
			reply(403, {});
			return;
		}
		reply(200, { token: issue(media[1]) });
		return;
	}
	const image = /^\/iiif\/3\/(a|b)\/(.*)$/.exec(req.url);
	if (image) {
		try {
			const token =
				new URL(req.url, apiOrigin).searchParams.get('token') ||
				(req.headers.authorization || '').replace(/^Bearer /, '');
			const [h, p, s] = token.split('.');
			const claims = JSON.parse(Buffer.from(p || '', 'base64url'));
			if (s !== sign(h + '.' + p) || claims.id !== image[1] || claims.exp <= Date.now() / 1000)
				throw Error();
		} catch {
			stats.missing++;
			reply(403, {});
			return;
		}
		stats.assets.push(image[1]);
		if (image[2] === 'info.json') {
			stats.info++;
			reply(200, {
				'@context': 'http://iiif.io/api/image/3/context.json',
				id: apiOrigin + '/iiif/3/' + image[1],
				type: 'ImageService3',
				protocol: 'http://iiif.io/api/image',
				profile: 'level2',
				width: 2048,
				height: 1024,
				tiles: [{ width: 256, scaleFactors: [1, 2, 4, 8] }]
			});
		} else {
			stats.tiles++;
			res.writeHead(200, { 'Content-Type': 'image/png' });
			res.end(png);
		}
		return;
	}
	reply(404, {});
});
await new Promise((r) => api.listen(0, '127.0.0.1', r));
apiOrigin = 'http://127.0.0.1:' + api.address().port;
const root = await mkdtemp(resolve(tmpdir(), 'salsah-media-'));
const repo = process.cwd();
await symlink(resolve(repo, 'node_modules'), resolve(root, 'node_modules'));
await writeFile(
	resolve(root, 'index.html'),
	'<div id="app"></div><script type="module" src="/main.js"></script>'
);
await writeFile(
	resolve(root, 'main.js'),
	`import {mount} from 'svelte'; import App from '/@fs/${repo}/tests/fixtures/media.svelte'; mount(App,{target:document.getElementById('app')});`
);
const mocks = {
	'$app/environment': 'export const browser=true;',
	'$app/stores':
		"import {readable} from 'svelte/store'; export const page=readable({url:new URL('http://localhost/')});",
	'$env/dynamic/public': `export const env=${JSON.stringify({ PUBLIC_API_URL: apiOrigin, PUBLIC_MEDIA_URL: apiOrigin })};`
};
const vite = await createServer({
	configFile: false,
	root,
	optimizeDeps: { exclude: ['oldap-guilib'] },
	plugins: [
		{
			name: 'fixture-env',
			enforce: 'pre',
			resolveId(id) {
				if (id in mocks) return '\0' + id;
			},
			load(id) {
				if (id[0] === '\0' && id.slice(1) in mocks) return mocks[id.slice(1)];
			}
		},
		svelte({ configFile: false })
	],
	resolve: {
		alias: { $lib: resolve(repo, 'src/lib') },
		dedupe: ['svelte'],
		conditions: ['browser']
	},
	server: { host: '127.0.0.1', port: 5190, fs: { allow: [repo, root] } },
	logLevel: 'error'
});
await vite.listen();
console.log('Viewer fixture: http://127.0.0.1:' + vite.httpServer.address().port);
console.log('Counters: ' + apiOrigin + '/stats');
async function close() {
	await vite.close();
	await new Promise((r) => api.close(r));
	await rm(root, { recursive: true, force: true });
	process.exit(0);
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
