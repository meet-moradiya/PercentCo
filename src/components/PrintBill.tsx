import React from "react";

export interface PrintBillProps {
  reservation: {
    _id: string;
    tableNumber?: number;
    name: string;
    date: string;
    time: string;
  } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  orders: any[];
}

export const PrintBill = React.forwardRef<HTMLDivElement, PrintBillProps>(
  ({ reservation, orders }, ref) => {
    if (!reservation) return null;

    // Aggregate items across all orders
    const itemsMap = new Map<string, { name: string; price: number; quantity: number; total: number }>();
    let subTotal = 0;
    let totalQty = 0;

    orders.forEach((o) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      o.items.forEach((item: any) => {
        const key = item.menuItemId || item.name;
        if (itemsMap.has(key)) {
          const existing = itemsMap.get(key)!;
          existing.quantity += item.quantity;
          existing.total += item.price * item.quantity;
        } else {
          itemsMap.set(key, {
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            total: item.price * item.quantity,
          });
        }
        subTotal += item.price * item.quantity;
        totalQty += item.quantity;
      });
    });

    const items = Array.from(itemsMap.values());

    // Tax calculation imitating reference image proportions
    const cgst = subTotal * 0.025;
    const sgst = subTotal * 0.025;
    const sTax = subTotal * 0.05;
    const finalTotal = subTotal + cgst + sgst + sTax;

    const padZero = (n: number) => (n < 10 ? `0${n}` : n);
    const currentDate = new Date();
    const formattedDate = `${padZero(currentDate.getDate())}-${currentDate.toLocaleString("default", { month: "short" })}-${currentDate.getFullYear() % 100} ${padZero(currentDate.getHours())}:${padZero(currentDate.getMinutes())}`;
    const invoiceNumber = `IN${reservation._id.substring(0, 10).toUpperCase()}`;

    return (
      <div className="hidden print:block print:w-full print:bg-white print:text-black print:p-4 print:font-mono text-sm">
        <div ref={ref} className="max-w-[300px] mx-auto pb-10">
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="font-bold text-lg mb-1">PercentCo POS</h1>
            <p>(PercentCo Private Limited)</p>
            <p>11/2 Sector- 37,</p>
            <p>Faridabad-121003.</p>
            <p>Ph. No. : 0129-4360377, 9311111116</p>
            <p>GSTIN : 06AACCO6344G1ZJ</p>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 mb-4">
            <span>Invoice Number:</span>
            <span className="text-right">{invoiceNumber}</span>
            <span>Invoice Date:</span>
            <span className="text-right">{formattedDate}</span>
            <span>Table:</span>
            <span className="text-right">{reservation.tableNumber ? `T${reservation.tableNumber}` : "Takeaway"}</span>
          </div>

          <div className="border-b-2 border-dashed border-black mb-2" />

          {/* Table Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 font-bold mb-2">
            <span>Item</span>
            <span className="text-right">Qty.</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Total</span>
          </div>

          <div className="border-b-2 border-dashed border-black mb-2" />

          {/* Items */}
          <div className="mb-4">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 mb-2 items-start">
                <span className="pr-2 uppercase leading-snug">{item.name}</span>
                <span className="text-right whitespace-nowrap">{item.quantity}</span>
                <span className="text-right whitespace-nowrap">{item.price.toFixed(2)}</span>
                <span className="text-right whitespace-nowrap">{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-b-2 border-dashed border-black mb-2" />

          {/* Totals */}
          <div className="flex flex-col gap-1 mb-4">
            <div className="flex justify-between">
              <span>Total Qty:</span>
              <span>{totalQty}</span>
            </div>
            <div className="flex justify-between">
              <span>Sub Total:</span>
              <span>{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>CGST@2.5</span>
              <span>{cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>SGST@2.5</span>
              <span>{sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold border-b border-black pb-1 mb-1">
              <span>S.Tax</span>
              <span>{sTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-1">
              <span>Total:</span>
              <span>{Math.round(finalTotal).toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-8">
            <p>Thanks For Visit....</p>
          </div>
        </div>
      </div>
    );
  }
);
PrintBill.displayName = "PrintBill";
