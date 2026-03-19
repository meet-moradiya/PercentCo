"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Table {
  number: number;
  capacity: number;
  isActive: boolean;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  category: string;
  tag: string;
  image?: string;
  isJainAvailable?: boolean;
}

interface CartItem {
  cartId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  isJain: boolean;
}

interface SeatedTable {
  tableNumber: number;
  capacity: number;
  guestName: string;
}

const categories = [
  { key: "all", label: "All" },
  { key: "starters", label: "Starters" },
  { key: "mains", label: "Mains" },
  { key: "desserts", label: "Desserts" },
  { key: "drinks", label: "Drinks" },
];

export default function WaiterOrderPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [seatedTables, setSeatedTables] = useState<SeatedTable[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{
    tableNumber: number;
  } | null>(null);
  const [orderError, setOrderError] = useState("");
  const [orderMode, setOrderMode] = useState<string>("both");

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, menuRes, reservationsRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/menu"),
        fetch(`/api/reservations?status=seated&date=${new Date().toISOString().split("T")[0]}`),
      ]);
      const settingsData = await settingsRes.json();
      const menuData = await menuRes.json();
      const reservationsData = await reservationsRes.json();

      const activeTables: Table[] = settingsData.settings?.tables?.filter((t: Table) => t.isActive) || [];
      setTables(activeTables);
      setOrderMode(settingsData.settings?.orderMode || "both");

      if (menuData.items) {
        setMenuItems(menuData.items);
      }

      // Build seated tables list
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reservations: any[] = reservationsData.reservations || [];
      const seated: SeatedTable[] = [];
      for (const r of reservations) {
        if (r.status === "seated") {
          const t = activeTables.find((tbl: Table) => tbl.number === r.tableNumber);
          if (t) {
            seated.push({
              tableNumber: t.number,
              capacity: t.capacity,
              guestName: r.name || "Guest",
            });
          }
        }
      }
      setSeatedTables(seated);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cart operations
  const addToCart = (item: MenuItem, isJain: boolean) => {
    const cartId = `${item._id}-${isJain ? "jain" : "reg"}`;
    setCart((prev) => {
      const existing = prev.find((c) => c.cartId === cartId);
      if (existing) {
        return prev.map((c) => (c.cartId === cartId ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          cartId,
          menuItemId: item._id,
          name: item.name,
          quantity: 1,
          isJain,
        },
      ];
    });
  };

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) => prev.map((c) => (c.cartId === cartId ? { ...c, quantity: c.quantity + delta } : c)).filter((c) => c.quantity > 0));
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((c) => c.cartId !== cartId));
  };

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const placeOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    setPlacing(true);
    setOrderError("");
    try {
      const res = await fetch("/api/waiter/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: selectedTable,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            name: c.name,
            quantity: c.quantity,
            isJain: c.isJain,
          })),
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOrderError(data.error || "Failed to place order");
        return;
      }
      setOrderPlaced({ tableNumber: selectedTable });
      setCart([]);
      setNotes("");
    } catch {
      setOrderError("Network error. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const filteredMenu = activeCategory === "all" ? menuItems : menuItems.filter((m) => m.category === activeCategory);

  const getCartQty = (id: string, isJain: boolean) => {
    const cartId = `${id}-${isJain ? "jain" : "reg"}`;
    return cart.find((c) => c.cartId === cartId)?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Block access when mode is customer-only
  if (orderMode === "customer") {
    return (
      <div className="flex items-center justify-center py-20 px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-2 border-yellow-400/30 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-2xl text-foreground font-semibold">Ordering Disabled</h1>
          <p className="text-muted">
            The admin has configured the system for customer self-ordering only. Waiter ordering is not available.
          </p>
          <Link
            href="/waiter"
            className="inline-block px-6 py-3 border border-blue-400 text-blue-400 text-sm tracking-widest uppercase hover:bg-blue-500 hover:text-white transition-all"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  // Order confirmation
  if (orderPlaced) {
    return (
      <div className="flex items-center justify-center py-20 px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-2 border-green-400 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl text-foreground font-semibold">Order Placed!</h1>
          <p className="text-muted">
            Order for <span className="text-blue-400 font-semibold">Table {orderPlaced.tableNumber}</span> has been sent to the kitchen.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setOrderPlaced(null);
                setSelectedTable(null);
              }}
              className="px-6 py-3 bg-blue-500 text-white text-sm font-semibold tracking-widest uppercase hover:bg-blue-600 transition-colors"
            >
              Place Another Order
            </button>
            <Link
              href="/waiter"
              className="px-6 py-3 border border-surface-border text-muted text-sm tracking-widest uppercase hover:text-foreground hover:border-foreground/30 transition-all"
            >
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Table selection (only seated tables)
  if (!selectedTable) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl text-foreground font-semibold">Place Order</h1>
              <p className="text-muted text-sm mt-1">Select a table with seated guests to place an order.</p>
            </div>
            <Link
              href="/waiter"
              className="px-4 py-2 text-xs text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-all tracking-wider uppercase"
            >
              ← Back
            </Link>
          </div>
        </div>

        {seatedTables.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-12 h-12 text-muted/30 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <p className="text-muted text-sm">No guests are currently seated.</p>
            <p className="text-muted/60 text-xs mt-1">A reservation must be marked as &quot;seated&quot; before you can place an order.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {seatedTables.map((t) => (
              <button
                key={t.tableNumber}
                onClick={() => setSelectedTable(t.tableNumber)}
                className="group border border-surface-border bg-surface p-5 text-center transition-all duration-300 hover:border-blue-400 hover:bg-blue-500/5"
              >
                <p className="text-2xl font-bold text-foreground group-hover:text-blue-400 transition-colors">T{t.tableNumber}</p>
                <p className="text-muted text-xs mt-1 truncate" title={t.guestName}>{t.guestName}</p>
                <span className="inline-block mt-2 text-[9px] text-green-400 border border-green-500/30 bg-green-900/20 px-1.5 py-0.5 uppercase tracking-wider">Seated</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Menu + Cart
  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setSelectedTable(null)}
          className="flex items-center gap-2 text-muted hover:text-foreground text-sm transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
            <path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"></path>
          </svg>
          <span>Back</span>
        </button>
        <div className="h-5 w-px bg-surface-border" />
        <span className="text-foreground font-semibold">Table {selectedTable}</span>
        {/* Cart badge for mobile */}
        <button
          onClick={() => {
            document.getElementById("waiter-cart-panel")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="lg:hidden relative ml-auto px-4 py-2 bg-blue-500 text-white text-sm font-semibold tracking-wider uppercase"
        >
          Cart
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Menu Section */}
        <div className="flex-1 min-w-0">
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 sm:border-b sm:border-surface-border">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`px-4 py-2 text-sm tracking-wider uppercase whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? "bg-blue-500 text-white font-semibold"
                    : "text-muted hover:text-foreground border border-surface-border hover:border-foreground/30"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Menu Grid */}
          {filteredMenu.length === 0 ? (
            <div className="text-center text-muted py-12">No items in this category.</div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredMenu.map((item) => {
                const qtyReg = getCartQty(item._id, false);
                const qtyJain = item.isJainAvailable ? getCartQty(item._id, true) : 0;

                return (
                  <div
                    key={item._id}
                    className="bg-surface border border-surface-border p-4 flex flex-col justify-between transition-all hover:border-blue-400/30"
                  >
                    <div className="mb-3">
                      <h3 className="text-foreground font-semibold text-sm">{item.name}</h3>
                      <p className="text-muted text-xs line-clamp-2 mt-1">{item.description}</p>
                      {item.tag && (
                        <span className="inline-block mt-2 px-2 py-0.5 text-[10px] uppercase tracking-wider text-blue-400 border border-blue-400/30">
                          {item.tag}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 pt-3 border-t border-surface-border/50">
                      {/* Regular Option */}
                      <div className="flex items-center justify-between">
                        {item.isJainAvailable && <span className="text-xs text-foreground/80 font-medium">Regular</span>}
                        {qtyReg === 0 ? (
                          <button
                            onClick={() => addToCart(item, false)}
                            className={`py-1.5 px-4 border border-blue-400/50 text-blue-400 text-xs tracking-wider uppercase hover:bg-blue-500 hover:text-white transition-all ${!item.isJainAvailable ? "w-full" : ""}`}
                          >
                            Add{item.isJainAvailable ? "" : " to Order"}
                          </button>
                        ) : (
                          <div className="flex items-center justify-between w-24">
                            <button
                              onClick={() => updateQuantity(`${item._id}-reg`, -1)}
                              className="w-7 h-7 flex items-center justify-center border border-surface-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
                            >
                              −
                            </button>
                            <span className="text-foreground text-sm font-bold">{qtyReg}</span>
                            <button
                              onClick={() => updateQuantity(`${item._id}-reg`, 1)}
                              className="w-7 h-7 flex items-center justify-center border border-blue-400 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Jain Option */}
                      {item.isJainAvailable && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-green-400 font-medium">Jain Prep</span>
                          {qtyJain === 0 ? (
                            <button
                              onClick={() => addToCart(item, true)}
                              className="py-1.5 px-4 border border-green-500/50 text-green-400 text-xs tracking-wider uppercase hover:bg-green-500 hover:text-white transition-all"
                            >
                              Add
                            </button>
                          ) : (
                            <div className="flex items-center justify-between w-24">
                              <button
                                onClick={() => updateQuantity(`${item._id}-jain`, -1)}
                                className="w-7 h-7 flex items-center justify-center border border-surface-border text-muted hover:text-foreground hover:border-foreground/30 transition-colors"
                              >
                                −
                              </button>
                              <span className="text-foreground text-sm font-bold">{qtyJain}</span>
                              <button
                                onClick={() => updateQuantity(`${item._id}-jain`, 1)}
                                className="w-7 h-7 flex items-center justify-center border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-white transition-all"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cart Panel */}
        <div id="waiter-cart-panel" className="lg:w-80 xl:w-96 shrink-0">
          <div className="lg:sticky lg:top-20 bg-surface border border-surface-border">
            <div className="px-5 py-4 border-b border-surface-border">
              <h2 className="text-foreground font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
                Order Items
                {cartCount > 0 && <span className="text-xs text-muted">({cartCount} items)</span>}
              </h2>
            </div>

            <div className="p-5">
              {cart.length === 0 ? (
                <p className="text-muted text-sm text-center py-8">No items added yet. Browse the menu to get started.</p>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.cartId} className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-medium truncate">
                          {item.name}
                          {item.isJain && (
                            <span className="ml-1.5 text-[9px] text-green-400 border border-green-500/30 px-1 py-0.5 uppercase tracking-wider bg-green-900/40 rounded align-middle">
                              Jain
                            </span>
                          )}
                        </p>
                        <p className="text-muted text-xs">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.cartId, -1)}
                            className="w-6 h-6 flex items-center justify-center border border-surface-border text-muted hover:text-foreground text-xs"
                          >
                            −
                          </button>
                          <span className="text-foreground text-xs font-bold w-5 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cartId, 1)}
                            className="w-6 h-6 flex items-center justify-center border border-blue-400 text-blue-400 hover:bg-blue-500 hover:text-white text-xs"
                          >
                            +
                          </button>
                        </div>
                        <button onClick={() => removeFromCart(item.cartId)} className="text-muted/50 hover:text-red-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-surface-border pt-4 mt-4">
                    {/* Notes */}
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special requests..."
                      className="w-full bg-background border border-surface-border px-3 py-2 text-sm text-foreground placeholder-muted/50 focus:border-blue-400 focus:outline-none resize-none transition-colors mb-4"
                    />

                    {orderError && <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 text-red-400 text-xs">{orderError}</div>}

                    <button
                      onClick={placeOrder}
                      disabled={placing}
                      className="w-full py-3 bg-blue-500 text-white text-sm font-semibold tracking-widest uppercase hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                      {placing ? "Placing Order..." : "Place Order"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
