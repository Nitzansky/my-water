// Receives lead-form submissions. Forwards them to LEAD_WEBHOOK_URL (e.g. an email/CRM webhook or a
// WordPress endpoint) once one is configured; until then it answers 501 and the form falls back to WhatsApp.
const MAX = 2000;
const clip = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX) : "");

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const lead = {
    name: clip(body.name), phone: clip(body.phone), email: clip(body.email), message: clip(body.message),
    source: clip(body.source), consent: body.consent === "on", receivedAt: new Date().toISOString(),
  };
  if (!lead.name || !/^0\d{8,9}$/.test(lead.phone.replace(/\D/g, "")) || !lead.consent) {
    return Response.json({ error: "invalid" }, { status: 422 });
  }

  const target = process.env.LEAD_WEBHOOK_URL;
  if (!target) return Response.json({ error: "no lead destination configured" }, { status: 501 });
  const res = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
  return res.ok ? Response.json({ ok: true }) : Response.json({ error: "forward failed" }, { status: 502 });
}
