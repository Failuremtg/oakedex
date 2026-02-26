import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { turnOnShellySwitches } from "@/lib/shelly";

/**
 * Shopify sends this webhook when an order is created (or use orders/paid if you prefer).
 * We verify HMAC, then turn on the light + disco ball via Shelly Cloud API.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (!hmacHeader) {
    return NextResponse.json({ error: "Missing HMAC" }, { status: 401 });
  }

  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  if (computed !== hmacHeader) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  let payload: { id?: number; order_number?: number };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Respond 200 quickly so Shopify doesn't retry; then trigger Shelly
  const orderId = payload.id ?? payload.order_number ?? "unknown";
  console.log(`Shopify order webhook received: order ${orderId}`);

  const shellyResult = await turnOnShellySwitches();

  if (!shellyResult.ok) {
    console.error("Shelly API error:", shellyResult.error);
    return NextResponse.json(
      { received: true, orderId, shellyError: shellyResult.error },
      { status: 200 }
    );
  }

  return NextResponse.json({
    received: true,
    orderId,
    shelly: "on",
  });
}
