"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { SITE } from "@/lib/site";

type Props = { title: string; submitLabel: string; source: string; withMessage?: boolean };
type Status = "idle" | "sending" | "sent" | "fallback";

// Lead form in the design style. Posts to /api/lead; when no lead destination is configured yet,
// the details are handed to WhatsApp (prefilled) so no lead is lost.
export function LeadForm({ title, submitLabel, source, withMessage }: Props) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [wa, setWa] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!/^0\d{8,9}$/.test(data.phone.replace(/\D/g, ""))) {
      setError("מספר הטלפון לא תקין. לדוגמה: 050-1234567");
      return;
    }
    setError("");
    setStatus("sending");
    const text = [`פנייה מהאתר (${title})`, `שם: ${data.name}`, `טלפון: ${data.phone}`, data.email && `דוא"ל: ${data.email}`, data.message && `הודעה: ${data.message}`]
      .filter(Boolean).join("\n");
    try {
      const res = await fetch("/api/lead/", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, source }) });
      if (res.ok) return setStatus("sent");
    } catch {}
    setWa(`${SITE.whatsapp}?text=${encodeURIComponent(text)}`);
    setStatus("fallback");
  }

  return (
    <section className="glass panel lead-form" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="h2">{title}</h2>
      {status === "sent" ? (
        <p className="lead" role="status">תודה! קיבלנו את הפרטים ונחזור אליכם בהקדם.</p>
      ) : status === "fallback" ? (
        <div role="status" className="lead-form__done">
          <p className="lead">כמעט סיימנו — שלחו את הפרטים בוואטסאפ ונחזור אליכם בהקדם.</p>
          <a href={wa} target="_blank" rel="noopener" className="btn btn-wa">שליחה בוואטסאפ</a>
          <p className="lead-form__note">או התקשרו: <a href={SITE.phoneHref} dir="ltr">{SITE.phone}</a></p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="lead-form__grid">
          <label className="lead-form__field">
            <span>שם</span>
            <input className="field" name="name" required autoComplete="name" />
          </label>
          <label className="lead-form__field">
            <span>טלפון</span>
            <input
              className="field" name="phone" type="tel" required autoComplete="tel" inputMode="tel" dir="ltr"
              aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined}
            />
          </label>
          {withMessage && (
            <>
              <label className="lead-form__field">
                <span>דוא&quot;ל</span>
                <input className="field" name="email" type="email" autoComplete="email" dir="ltr" />
              </label>
              <label className="lead-form__field lead-form__wide">
                <span>הודעה</span>
                <textarea className="field" name="message" />
              </label>
            </>
          )}
          <label className="lead-form__consent lead-form__wide">
            <input type="checkbox" name="consent" required />
            <span>קראתי ואני מסכים/ה ל<Link href="/תקנון-האתר/">תקנון האתר</Link> ולשמירת הפרטים לצורך חזרה אליי.</span>
          </label>
          {error && <p id={`${id}-err`} className="lead-form__error lead-form__wide" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary lead-form__wide" disabled={status === "sending"}>
            {status === "sending" ? "שולח…" : submitLabel}
          </button>
        </form>
      )}
    </section>
  );
}
