import mongoose, { Schema, Document } from "mongoose";

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isJain: boolean;
  station: mongoose.Types.ObjectId | null;
  stationName: string;
  stationSlug: string;
  servePhase: number;
  itemStatus: "pending" | "preparing" | "ready";
  startedAt: Date | null;
  readyAt: Date | null;
  preparedBy: string | null;
  preCookable: boolean;
}

export interface IOrder extends Document {
  tableNumber: number;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "preparing" | "partially_ready" | "ready" | "served" | "cancelled";
  notes: string;
  reservationId: mongoose.Types.ObjectId | null;
  customerId: string; // phone number or "walk-in"
  source: "customer" | "waiter";
  completedAt: Date | null;
  createdAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    menuItemId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    isJain: { type: Boolean, default: false },
    station: { type: Schema.Types.ObjectId, ref: "Station", default: null },
    stationName: { type: String, default: "" },
    stationSlug: { type: String, default: "" },
    servePhase: { type: Number, default: 2 },
    itemStatus: { type: String, enum: ["pending", "preparing", "ready"], default: "pending" },
    startedAt: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    preparedBy: { type: String, default: null },
    preCookable: { type: Boolean, default: false },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    tableNumber: { type: Number, required: true },
    customerName: { type: String, required: true, lowercase: true },
    items: { type: [OrderItemSchema], required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "preparing", "partially_ready", "ready", "served", "cancelled"],
      default: "pending",
    },
    notes: { type: String, default: "" },
    reservationId: { type: Schema.Types.ObjectId, ref: "Reservation", default: null },
    customerId: { type: String, required: true, lowercase: true }, // phone number or "walk-in"
    source: { type: String, enum: ["customer", "waiter"], default: "customer" },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ tableNumber: 1, status: 1 });
OrderSchema.index({ reservationId: 1 });
OrderSchema.index({ customerId: 1 });
OrderSchema.index({ createdAt: -1 });

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
