/**
 * Shelly Cloud API v2 – switch control.
 * Docs: https://shelly-api-docs.shelly.cloud/cloud-control-api/
 * Rate limit: 1 request per second; we stagger the two device calls.
 */

const SHELLY_SERVER = process.env.SHELLY_SERVER_URI?.replace(/\/$/, "");
const AUTH_KEY = process.env.SHELLY_AUTH_KEY;
const DEVICE_ID_LIGHT = process.env.SHELLY_DEVICE_ID_LIGHT;
const DEVICE_ID_DISCO = process.env.SHELLY_DEVICE_ID_DISCO;

export async function turnOnShellySwitches(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!SHELLY_SERVER || !AUTH_KEY) {
    return { ok: false, error: "SHELLY_SERVER_URI or SHELLY_AUTH_KEY not set" };
  }

  const deviceIds = [DEVICE_ID_LIGHT, DEVICE_ID_DISCO].filter(Boolean);
  if (deviceIds.length === 0) {
    return { ok: false, error: "No Shelly device IDs configured" };
  }

  const url = `${SHELLY_SERVER}/v2/devices/api/set/switch?auth_key=${encodeURIComponent(AUTH_KEY)}`;

  for (let i = 0; i < deviceIds.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1100));
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deviceIds[i], on: true }),
    });
    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        error: `Shelly API ${res.status}: ${text}`,
      };
    }
  }

  return { ok: true };
}
