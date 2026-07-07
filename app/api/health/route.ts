import { loadGlobalData } from '../../../lib/server/dataCache';

/**
 * Liveness/readiness probe. Returns 200 only if the core dataset loads and has
 * a populated verse index — i.e. the Lambda can actually serve pages. Uptime
 * monitors can watch this instead of a page route (which always 200s).
 */
export async function GET() {
  try {
    const data = await loadGlobalData();
    const ok = Boolean(data?.index && Object.keys(data.index).length > 0);
    return Response.json({ ok }, { status: ok ? 200 : 503 });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
