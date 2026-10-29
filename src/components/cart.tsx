"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartProduct = { id: number; name: string; price: number; path: string; image: string | null };
export type CartItem = CartProduct & { qty: number };

type CartApi = {
  items: CartItem[];
  count: number;
  total: number;
  ready: boolean;
  add: (p: CartProduct, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  announce: string;
};

const KEY = "mw-cart";
const CartContext = createContext<CartApi | null>(null);

function load(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((i) => typeof i?.id === "number" && i.qty > 0) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    setItems(load());
    setReady(true);
    const sync = (e: StorageEvent) => e.key === KEY && setItems(load());
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const save = useCallback((next: CartItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }, []);

  const api = useMemo<CartApi>(() => ({
    items,
    ready,
    announce,
    count: items.reduce((n, i) => n + i.qty, 0),
    total: items.reduce((n, i) => n + i.qty * i.price, 0),
    add: (p, qty = 1) => {
      const existing = items.find((i) => i.id === p.id);
      save(existing ? items.map((i) => (i.id === p.id ? { ...i, ...p, qty: i.qty + qty } : i)) : [...items, { ...p, qty }]);
      setAnnounce(`${p.name} נוסף לסל`);
    },
    setQty: (id, qty) => save(qty < 1 ? items.filter((i) => i.id !== id) : items.map((i) => (i.id === id ? { ...i, qty } : i))),
    remove: (id) => {
      const it = items.find((i) => i.id === id);
      save(items.filter((i) => i.id !== id));
      if (it) setAnnounce(`${it.name} הוסר מהסל`);
    },
  }), [items, ready, announce, save]);

  return (
    <CartContext.Provider value={api}>
      {children}
      {/* screen-reader announcements for cart changes */}
      <p role="status" aria-live="polite" className="sr-only">{announce}</p>
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart outside CartProvider");
  return ctx;
}

export function CartCount() {
  const { count, ready } = useCart();
  return <span className="cart-badge">{ready ? count : 0}</span>;
}
