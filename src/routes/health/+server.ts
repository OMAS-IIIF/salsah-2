import { json } from '@sveltejs/kit';

/** Container liveness only; backend acceptance is checked separately at deployment. */
export function GET() {
	return json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
