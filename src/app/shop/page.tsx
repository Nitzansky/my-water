import type { Metadata } from "next";
import { StorePage } from "@/components/StorePage";

export const metadata: Metadata = {
  title: "חנות — כל המוצרים",
  description: "כל המוצרים של myWater: מסננים לתמי 4, ברי מים, מערכות אוסמוזה הפוכה, מסנני אבנית, חלפים ומחברים. משלוח עד הבית או התקנה עם טכנאי.",
  alternates: { canonical: "/shop/" },
};

export default function Shop() {
  return <StorePage title="המוצרים שלנו" crumb="חנות" />;
}
