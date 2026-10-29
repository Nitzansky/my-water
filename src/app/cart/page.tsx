import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui";
import { CartView } from "./CartView";

export const metadata: Metadata = { title: "סל הקניות", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container page">
      <Breadcrumbs items={[{ label: "סל קניות" }]} />
      <h1 className="h1">סל הקניות</h1>
      <CartView />
    </div>
  );
}
