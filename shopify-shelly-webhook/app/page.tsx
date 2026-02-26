export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Shopify → Shelly Webhook</h1>
      <p>
        This app receives Shopify order webhooks and turns on your Shelly smart
        plugs (light + disco ball).
      </p>
      <p>
        <strong>Webhook URL:</strong>{" "}
        <code>/api/webhooks/shopify-order</code>
      </p>
      <p>Configure this URL in Shopify and set env vars in Vercel.</p>
    </main>
  );
}
