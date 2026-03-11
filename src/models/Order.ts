import mongoose, { Schema, Document } from "mongoose";

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  isJain: boolean;
}

export interface IOrder extends Document {
  tableNumber: number;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "preparing" | "ready" | "served" | "cancelled";
  notes: string;
  createdAt: Date;
}

const OrderItemSchema = new Schema<OrderItem>(
  {
    menuItemId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    isJain: { type: Boolean, default: false },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    tableNumber: { type: Number, required: true },
    customerName: { type: String, default: "Guest" },
    items: { type: [OrderItemSchema], required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ tableNumber: 1, status: 1 });

export default mongoose.models.Order ||
  mongoose.model<IOrder>("Order", OrderSchema);
