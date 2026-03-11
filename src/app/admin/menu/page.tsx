"use client";

import { useEffect, useState, useCallback } from "react";

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  tag: string;
  image?: string;
  isJainAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  category: "starters",
  tag: "",
  image: "",
  isJainAvailable: false,
  isActive: true,
  sortOrder: 0,
};

export default function AdminMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");

  const loadItems = useCallback(async () => {
    try {
      const res = await fetch("/api/menu?all=true");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowModal(true); };

  const openEdit = (item: MenuItem) => {
    setEditingId(item._id);
    setForm({ 
      name: item.name, 
      description: item.description, 
      price: item.price, 
      category: item.category, 
      tag: item.tag || "", 
      image: item.image || "",
      isJainAvailable: item.isJainAvailable || false,
      isActive: item.isActive, 
      sortOrder: item.sortOrder || 0 
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.description || !form.price) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/menu/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else {
        await fetch("/api/menu", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      }
      setShowModal(false);
      loadItems();
    } catch (error) { console.error("Save error:", error); } finally { setSaving(false); }
  };

  const toggleActive = async (item: MenuItem) => {
    try {
      await fetch(`/api/menu/${item._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !item.isActive }) });
      loadItems();
    } catch (error) { console.error("Toggle error:", error); }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this menu item permanently?")) return;
    try { await fetch(`/api/menu/${id}`, { method: "DELETE" }); loadItems(); } catch (error) { console.error("Delete error:", error); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setForm({ ...form, image: "" });
  };

  const filteredItems = items
    .filter((i) => activeTab === "all" || i.category === activeTab)
    .filter((i) => statusFilter === "all" || (statusFilter === "active" ? i.isActive : !i.isActive));
  const categories = ["all", "starters", "mains", "desserts", "drinks"];
  const statusFilters: { key: "all" | "active" | "hidden"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "hidden", label: "Hidden" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl text-foreground font-semibold">Menu Items</h1>
          <p className="text-muted text-sm mt-1">Manage your restaurant menu</p>
        </div>
        <button onClick={openCreate} className="px-6 py-2.5 bg-gold text-background text-sm font-semibold tracking-widest uppercase hover:bg-gold-light transition-colors">
          + Add Item
        </button>
      </div>

      {/* Filters: All, Active, Hidden, then categories */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* All — resets both filters */}
        <button
          onClick={() => { setActiveTab("all"); setStatusFilter("all"); }}
          className={`px-4 py-2 text-sm tracking-wider uppercase border transition-all ${
            activeTab === "all" && statusFilter === "all"
              ? "border-gold text-gold bg-gold/10"
              : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          All
        </button>

        {/* Active */}
        <button
          onClick={() => { setStatusFilter("active"); setActiveTab("all"); }}
          className={`px-4 py-2 text-sm tracking-wider uppercase border transition-all ${
            statusFilter === "active"
              ? "border-green-400 text-green-400 bg-green-400/10"
              : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          Active
        </button>

        {/* Hidden */}
        <button
          onClick={() => { setStatusFilter("hidden"); setActiveTab("all"); }}
          className={`px-4 py-2 text-sm tracking-wider uppercase border transition-all ${
            statusFilter === "hidden"
              ? "border-red-400 text-red-400 bg-red-400/10"
              : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
          }`}
        >
          Hidden
        </button>

        {/* Category filters */}
        {["starters", "mains", "desserts", "drinks"].map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveTab(cat); setStatusFilter("all"); }}
            className={`px-4 py-2 text-sm tracking-wider uppercase border transition-all ${
              activeTab === cat
                ? "border-gold text-gold bg-gold/10"
                : "border-surface-border text-muted hover:border-foreground/30 hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Items Table */}
      <div className="bg-surface border border-surface-border overflow-x-auto transition-colors duration-300">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-muted">
            No menu items found. Click &quot;Add Item&quot; to create one.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left w-16">Image</th>
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Price</th>
                <th className="px-4 py-3 text-left">Tag</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filteredItems.map((item) => (
                <tr key={item._id} className="hover:bg-surface-light transition-colors">
                  <td className="px-4 py-3">
                    {item.image ? (
                      <div className="w-12 h-12 rounded overflow-hidden border border-surface-border shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded bg-surface-border/50 flex items-center justify-center shrink-0">
                        <span className="text-[10px] text-muted font-medium">None</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium flex items-center gap-2">
                       {item.name}
                       {item.isJainAvailable && (
                         <span title="Available for Jain" className="px-1.5 py-0.5 text-[10px] bg-green-900/40 text-green-400 border border-green-500/30 rounded uppercase tracking-wider">
                           Jain Opt
                         </span>
                       )}
                    </p>
                    <p className="text-muted text-xs mt-0.5 max-w-xs truncate">{item.description}</p>
                  </td>
                  <td className="px-4 py-3"><span className="text-muted text-sm capitalize">{item.category}</span></td>
                  <td className="px-4 py-3 text-gold font-medium">{item.price}</td>
                  <td className="px-4 py-3">
                    {item.tag ? (
                      <span className="px-2 py-0.5 text-xs border border-gold/30 text-gold">{item.tag}</span>
                    ) : (
                      <span className="text-muted/50">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`px-2 py-1 text-xs uppercase tracking-wider border transition-colors ${
                        item.isActive ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-muted border-surface-border bg-surface"
                      }`}
                    >
                      {item.isActive ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(item)} className="px-2 py-1 text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 transition-colors">Edit</button>
                      <button onClick={() => deleteItem(item._id)} className="px-2 py-1 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-foreground font-medium text-lg">{editingId ? "Edit Menu Item" : "Add Menu Item"}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-foreground text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors" placeholder="Wagyu Ribeye" />
              </div>
              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Description *</label>
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none resize-none transition-colors" placeholder="A5 Japanese wagyu, bone marrow butter..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Price *</label>
                  <input type="text" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors" placeholder="$85" />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Category *</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors">
                    <option value="starters">Starters</option>
                    <option value="mains">Main Courses</option>
                    <option value="desserts">Desserts</option>
                    <option value="drinks">Cocktails</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Tag</label>
                  <input type="text" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors" placeholder="Signature, Chef's Pick..." />
                </div>
                <div>
                  <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Sort Order</label>
                  <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                    className="w-full bg-background border border-surface-border px-4 py-2.5 text-foreground focus:border-gold focus:outline-none transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-muted text-sm mb-1.5 tracking-wider uppercase">Menu Item Image</label>
                {form.image ? (
                  <div className="flex items-end gap-4">
                    <div className="w-24 h-24 rounded border border-surface-border overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <button type="button" onClick={removeImage} className="px-3 py-1.5 text-xs text-red-400 border border-red-400/30 hover:bg-red-400/10 transition-colors uppercase tracking-wider">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <input type="file" accept="image/*" onChange={handleImageChange}
                      className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:border file:border-surface-border file:text-sm file:font-semibold file:bg-surface file:text-foreground hover:file:bg-surface-light cursor-pointer" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4 accent-[var(--gold)]" />
                  <span className="text-foreground text-sm">Active (visible directly)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.isJainAvailable} onChange={(e) => setForm({ ...form, isJainAvailable: e.target.checked })} className="w-4 h-4 accent-[var(--gold)]" />
                  <span className="text-foreground text-sm">Available for Jain</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-surface-border flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-sm text-muted border border-surface-border hover:text-foreground hover:border-foreground/30 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name || !form.description || !form.price}
                className="px-5 py-2 text-sm bg-gold text-background font-semibold tracking-wider uppercase hover:bg-gold-light transition-colors disabled:opacity-50">
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
