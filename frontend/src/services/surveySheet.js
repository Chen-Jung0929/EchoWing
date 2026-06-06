const UPLOAD_TIMEOUT_MS = 20_000;

function parseAppsScriptBody(text) {
  const trimmed = text?.trim() ?? '';
  if (!trimmed) {
    return { parseError: 'Empty response from spreadsheet endpoint' };
  }
  if (trimmed.startsWith('<')) {
    return {
      parseError:
        'Received HTML instead of JSON. Check Web App deployment: Execute as Me, access Anyone.',
    };
  }
  try {
    return { body: JSON.parse(trimmed) };
  } catch {
    return { parseError: 'Invalid JSON response from spreadsheet endpoint' };
  }
}

function getSheetConfig() {
  const url = import.meta.env.VITE_GOOGLE_SHEETS_WEBAPP_URL?.trim();
  const secret = import.meta.env.VITE_GOOGLE_SHEETS_SECRET?.trim() ?? '';
  return { url, secret };
}

/**
 * @returns {boolean}
 */
export function isSurveySheetConfigured() {
  const { url } = getSheetConfig();
  return typeof url === 'string' && url.length > 0;
}

/**
 * @param {Record<string, unknown>} body
 */
async function postToSheet(body) {
  const { url, secret } = getSheetConfig();

  if (!url) {
    return { skipped: true, body: null };
  }

  if (!secret) {
    throw new Error(
      'VITE_GOOGLE_SHEETS_SECRET is missing. Set the same value as Apps Script SHEET_SECRET (not the deployment ID).'
    );
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, ...body }),
      signal: controller.signal,
    });

    const text = await response.text();
    const { body: parsed, parseError } = parseAppsScriptBody(text);

    if (parseError) {
      throw new Error(parseError);
    }

    if (!response.ok) {
      throw new Error(
        (parsed && typeof parsed.message === 'string' && parsed.message) ||
          `HTTP ${response.status}`
      );
    }

    if (parsed?.ok !== true) {
      throw new Error(
        typeof parsed?.message === 'string'
          ? parsed.message
          : parsed?.ok === false
            ? 'Request rejected'
            : 'Unexpected response from spreadsheet endpoint'
      );
    }

    return { ok: true, body: parsed };
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    if (err instanceof TypeError && /fetch/i.test(err.message)) {
      throw new Error(
        'Network or CORS error. Redeploy Web App as Execute as Me with access Anyone.'
      );
    }
    throw err instanceof Error ? err : new Error(String(err));
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * @param {Record<string, string>} payload
 * @returns {Promise<{ skipped?: boolean, ok?: boolean }>}
 */
export async function submitSurveyRecord(payload) {
  const outcome = await postToSheet({ action: 'append', ...payload });
  if (outcome.skipped) return { skipped: true };
  return { ok: true };
}

/**
 * @typedef {{
 *   observed_at: string;
 *   location: string;
 *   latitude: string;
 *   longitude: string;
 *   predicted_species: string;
 *   observer_name: string;
 *   observer_comment: string;
 *   model: string;
 *   distance_km: number;
 * }} NearbySheetRecord
 */

/**
 * @param {{ latitude: number, longitude: number, radiusKm?: number, limit?: number }} params
 * @returns {Promise<NearbySheetRecord[]>}
 */
export async function queryNearbyRecords({
  latitude,
  longitude,
  radiusKm = 5,
  limit = 20,
}) {
  const outcome = await postToSheet({
    action: 'query_nearby',
    latitude,
    longitude,
    radius_km: radiusKm,
    limit,
  });

  if (outcome.skipped) {
    return [];
  }

  const records = outcome.body?.records;
  return Array.isArray(records) ? records : [];
}
