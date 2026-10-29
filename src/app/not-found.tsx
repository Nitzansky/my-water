import Link from "next/link";
import { SITE } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="container page" style={{ alignItems: "flex-start" }}>
      <span className="kicker">שגיאה 404</span>
      <h1 className="h1">העמוד לא נמצא</h1>
      <p className="lead">ייתכן שהעמוד הועבר. אפשר לחפש מוצר, לעבור למפת האתר או להתקשר ונעזור.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/shop/" className="btn btn-primary">לכל המוצרים</Link>
        <Link href="/site-map/" className="btn btn-white">מפת האתר</Link>
        <a href={SITE.phoneHref} className="btn btn-white"><span dir="ltr">{SITE.phone}</span></a>
      </div>
    </div>
  );
}
