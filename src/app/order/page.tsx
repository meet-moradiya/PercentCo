"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";

interface Table {
  number: number;
  capacity: number;
  isActive: boolean;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  tag: string;
  image?: string;
  isJainAvailable?: boolean;
}

interface CartItem {
  cartId: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isJain: boolean;
}

const categories = [
  { key: "all", label: "All" },
  { key: "starters", label: "Starters" },
  { key: "mains", label: "Mains" },
  { key: "desserts", label: "Desserts" },
  { key: "drinks", label: "Drinks" },
];

function OrderPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get("table");

  const [tables, setTables] = useState<Table[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(tableParam ? Number(tableParam) : null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState<{
    id: string;
    total: number;
    tableNumber: number;
  } | null>(null);
  const [orderError, setOrderError] = useState("");

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [settingsRes, menuRes] = await Promise.all([fetch("/api/settings"), fetch("/api/menu")]);
      const settingsData = await settingsRes.json();
      const menuData = await menuRes.json();

      if (settingsData.settings?.tables) {
        setTables(settingsData.settings.tables.filter((t: Table) => t.isActive));
      }
      if (menuData.items) {
        setMenuItems(menuData.items);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update URL when table changes
  const selectTable = (num: number) => {
    setSelectedTable(num);
    router.replace(`/order?table=${num}`, { scroll: false });
  };

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
          price: parseFloat(item.price),
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

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  // Open OTP modal when clicking "Place Order"
  const initiateOrder = () => {
    if (!selectedTable || cart.length === 0) return;
    setOrderError("");
    // If already verified, place directly
    if (verifiedCode) {
      placeOrder(verifiedCode);
    } else {
      setOtpCode("");
      setOtpError("");
      setShowOtpModal(true);
    }
  };

  // Verify OTP and place order
  const handleOtpSubmit = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setOtpError("Please enter a valid 6-digit code");
      return;
    }
    setVerifyingOtp(true);
    setOtpError("");
    try {
      const verifyRes = await fetch("/api/table-codes/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: selectedTable, code: otpCode.trim() }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.valid) {
        setOtpError(verifyData.error || "Invalid code. Please try again.");
        return;
      }
      // Code is valid — save and place order
      setVerifiedCode(otpCode.trim());
      setShowOtpModal(false);
      placeOrder(otpCode.trim());
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Place order with verified code
  const placeOrder = async (code: string) => {
    if (!selectedTable || cart.length === 0) return;
    setPlacing(true);
    setOrderError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: selectedTable,
          customerName: customerName || "Guest",
          items: cart,
          notes,
          orderCode: code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // If the code was rejected, clear verified state so they re-enter
        if (res.status === 403) {
          setVerifiedCode(null);
        }
        setOrderError(data.error || "Failed to place order");
        return;
      }
      setOrderPlaced({
        id: data.order.id,
        total: data.order.total,
        tableNumber: data.order.tableNumber,
      });
      setCart([]);
    } catch {
      setOrderError("Network error. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  // Filtered menu
  const filteredMenu = activeCategory === "all" ? menuItems : menuItems.filter((m) => m.category === activeCategory);

  const getCartQty = (id: string, isJain: boolean) => {
    const cartId = `${id}-${isJain ? "jain" : "reg"}`;
    return cart.find((c) => c.cartId === cartId)?.quantity || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Order confirmation
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 mx-auto border-2 border-green-400 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-3xl text-foreground">Order Placed!</h1>
          <p className="text-foreground/60">
            Your order for <span className="text-gold font-semibold">Table {orderPlaced.tableNumber}</span> has been received.
          </p>
          <div className="bg-surface border border-surface-border p-6">
            <p className="text-muted text-xs tracking-wider uppercase mb-1">Total</p>
            <p className="text-3xl font-bold text-gold">₹{orderPlaced.total.toFixed(2)}</p>
            <p className="text-muted text-xs mt-3">Your order is being prepared</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setOrderPlaced(null);
                setCustomerName("");
                setNotes("");
              }}
              className="px-6 py-3 border border-gold text-gold text-sm tracking-widest uppercase hover:bg-gold hover:text-background transition-all"
            >
              Order More
            </button>
            <Link
              href="/"
              className="px-6 py-3 border border-surface-border text-muted text-sm tracking-widest uppercase hover:text-foreground hover:border-foreground/30 transition-all"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Table selection
  if (!selectedTable) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-surface border-b border-surface-border">
          <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-gold text-sm tracking-widest uppercase hover:text-gold-light transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
                <path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"></path>
              </svg>
              <span>Back</span>
            </Link>
            <div>
              <Link href="/" className="hover:opacity-80 transition-opacity duration-300">
                <Logo size={44} />
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <div className="text-gold text-sm tracking-[0.3em] uppercase">Step 1</div>
            <h1 className="mt-2 font-display text-xl text-foreground">Place an Order</h1>
            <h2 className="font-display text-3xl md:text-4xl mt-2 mb-4 text-foreground">Select Your Table</h2>
            <p className="text-foreground/50 max-w-md mx-auto">Choose the table where you&apos;re seated to start placing your order.</p>
          </div>

          {tables.length === 0 ? (
            <div className="text-center text-muted py-12">No tables available at this time.</div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {tables.map((t) => (
                <button
                  key={t.number}
                  onClick={() => selectTable(t.number)}
                  className="group border border-surface-border bg-surface p-6 text-center transition-all duration-300 hover:border-gold hover:bg-gold/5"
                >
                  <p className="text-2xl font-bold text-foreground group-hover:text-gold transition-colors">T{t.number}</p>
                  <p className="text-muted text-xs mt-1">{t.capacity} seats</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Menu + Cart
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-surface-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setSelectedTable(null);
                router.replace("/order", { scroll: false });
              }}
              className="flex items-center gap-2 text-muted hover:text-foreground text-sm transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M228,128a12,12,0,0,1-12,12H69l51.52,51.51a12,12,0,0,1-17,17l-72-72a12,12,0,0,1,0-17l72-72a12,12,0,0,1,17,17L69,116H216A12,12,0,0,1,228,128Z"></path>
              </svg>
              <span>Back</span>
            </button>
            <div className="h-5 w-px bg-surface-border" />
            <span className="text-foreground font-semibold">Table {selectedTable}</span>
          </div>

          {/* Cart badge for mobile */}
          <button
            onClick={() => {
              document.getElementById("cart-panel")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="lg:hidden relative px-4 py-2 bg-gold text-background text-sm font-semibold tracking-wider uppercase"
          >
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
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
                    ? "bg-gold text-background font-semibold"
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
            <div className="grid sm:grid-cols-2 gap-4">
              {filteredMenu.map((item) => {
                const qtyReg = getCartQty(item._id, false);
                const qtyJain = item.isJainAvailable ? getCartQty(item._id, true) : 0;
                
                return (
                  <div
                    key={item._id}
                    className="bg-surface border border-surface-border p-5 flex flex-col justify-between transition-all hover:border-gold/30"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-foreground font-semibold">{item.name}</h3>
                        <span className="text-gold font-bold whitespace-nowrap">₹{item.price}</span>
                      </div>
                      
                      <div className="flex gap-4 items-start mb-3">
                        <div className="w-16 h-16 shrink-0 border border-surface-border overflow-hidden rounded bg-surface-light">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img 
                            src={item.image || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"} 
                            alt={item.name} 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-muted text-sm line-clamp-2">{item.description}</p>
                          {item.tag && (
                            <span className="px-2 py-0.5 mt-2 text-[10px] uppercase tracking-wider text-gold border border-gold/30 inline-block">
                              {item.tag}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 space-y-2">
                       {/* Regular Option */}
                       <div className="flex items-center justify-between">
                         {item.isJainAvailable && <span className="text-sm text-foreground/80">Regular</span>}
                         {qtyReg === 0 ? (
                            <button
                              onClick={() => addToCart(item, false)}
                              className={`py-1.5 px-4 border border-gold text-gold text-xs tracking-wider uppercase hover:bg-gold hover:text-background transition-all ${!item.isJainAvailable ? "w-full" : ""}`}
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
                                className="w-7 h-7 flex items-center justify-center border border-gold text-gold hover:bg-gold hover:text-background transition-all"
                              >
                                +
                              </button>
                            </div>
                          )}
                       </div>
                       
                       {/* Jain Option */}
                       {item.isJainAvailable && (
                         <div className="flex items-center justify-between pt-2 border-t border-surface-border/50">
                           <span className="text-sm text-green-400 font-medium">Jain Preparation</span>
                           {qtyJain === 0 ? (
                              <button
                                onClick={() => addToCart(item, true)}
                                className="py-1.5 px-4 border border-green-500/50 text-green-400 text-xs tracking-wider uppercase hover:bg-green-500 hover:text-background transition-all"
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
                                  className="w-7 h-7 flex items-center justify-center border border-green-500/50 text-green-400 hover:bg-green-500 hover:text-background transition-all"
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
        <div id="cart-panel" className="lg:w-80 xl:w-96 shrink-0">
          <div className="lg:sticky lg:top-20 bg-surface border border-surface-border">
            <div className="px-5 py-4 border-b border-surface-border">
              <h2 className="text-foreground font-semibold flex items-center gap-2">
                <svg className="w-5 h-5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                  />
                </svg>
                Your Order
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
                        <p className="text-muted text-xs">
                          ₹{item.price} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gold text-sm font-semibold w-16 text-right">₹{(item.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => removeFromCart(item.cartId)} className="text-muted/50 hover:text-red-400 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="border-t border-surface-border pt-4 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-foreground font-semibold">Total</span>
                      <span className="text-gold text-xl font-bold">₹{cartTotal.toFixed(2)}</span>
                    </div>

                    {/* Customer name */}
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name (optional)"
                      className="w-full bg-background border border-surface-border px-3 py-2 text-sm text-foreground placeholder-muted/50 focus:border-gold focus:outline-none transition-colors mb-3"
                    />

                    {/* Notes */}
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special requests..."
                      className="w-full bg-background border border-surface-border px-3 py-2 text-sm text-foreground placeholder-muted/50 focus:border-gold focus:outline-none resize-none transition-colors mb-4"
                    />

                    {orderError && <div className="mb-3 p-2 bg-red-900/20 border border-red-500/30 text-red-400 text-xs">{orderError}</div>}

                    <button
                      onClick={initiateOrder}
                      disabled={placing}
                      className="w-full py-3 bg-gold text-background text-sm font-semibold tracking-widest uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
                    >
                      {placing ? "Placing Order..." : "Place Order"}
                    </button>

                    {verifiedCode && (
                      <p className="text-green-400 text-[10px] text-center mt-2">
                        <svg className="w-3 h-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                        Verified — code accepted
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-sm">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium">Enter Order Code</h2>
              <button onClick={() => setShowOtpModal(false)} className="text-muted hover:text-foreground text-xl">
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto border border-gold/30 bg-gold/5 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                    />
                  </svg>
                </div>
                <p className="text-foreground/70 text-sm">Enter the 6-digit code sent to your email to verify your order.</p>
              </div>

              {otpError && <div className="p-2 bg-red-900/20 border border-red-500/30 text-red-400 text-xs text-center">{otpError}</div>}

              <input
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtpCode(v);
                }}
                placeholder="000000"
                maxLength={6}
                className="w-full bg-background border border-surface-border px-4 py-4 text-center text-2xl font-bold text-foreground tracking-[8px] placeholder-muted/30 focus:border-gold focus:outline-none transition-colors"
                autoFocus
              />

              <button
                onClick={handleOtpSubmit}
                disabled={verifyingOtp || otpCode.length !== 6}
                className="w-full py-3 bg-gold text-background text-sm font-semibold tracking-widest uppercase hover:bg-gold-light transition-colors disabled:opacity-50"
              >
                {verifyingOtp ? "Verifying..." : "Verify & Place Order"}
              </button>

              <p className="text-muted text-[10px] text-center">The code was sent when you were seated. Ask staff if you need help.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrderPageInner />
    </Suspense>
  );
}
