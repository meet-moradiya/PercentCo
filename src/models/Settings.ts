import mongoose, { Schema, Document } from "mongoose";

export interface TableConfig {
  number: number;
  capacity: number;
  isActive: boolean;
}

export interface ClosedDate {
  date: string;
  reason: string;
}

export interface EventPromo {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  discount: string;     // e.g. "20% OFF", "Free Dessert", "₹500 Off"
  badgeColor: string;   // e.g. "gold", "red", "green", "blue"
  isActive: boolean;
}

export interface ISettings extends Document {
  totalTables: number;
  tables: TableConfig[];
  slotDuration: number;
  openTime: string;
  closeTime: string;
  slotInterval: number;
  closedDates: ClosedDate[];
  events: EventPromo[];
}

const TableConfigSchema = new Schema<TableConfig>(
  {
    number: { type: Number, required: true },
    capacity: { type: Number, required: true, min: 1, default: 4 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const ClosedDateSchema = new Schema<ClosedDate>(
  {
    date: { type: String, required: true },
    reason: { type: String, default: "Holiday" },
  },
  { _id: false }
);

const EventPromoSchema = new Schema<EventPromo>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    discount: { type: String, default: "" },
    badgeColor: { type: String, default: "gold" },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const SettingsSchema = new Schema<ISettings>(
  {
    totalTables: { type: Number, required: true, min: 1, default: 10 },
    tables: { type: [TableConfigSchema], default: [] },
    slotDuration: { type: Number, default: 90, min: 30 },
    openTime: { type: String, default: "18:00" },
    closeTime: { type: String, default: "22:00" },
    slotInterval: { type: Number, default: 30, enum: [15, 30] },
    closedDates: { type: [ClosedDateSchema], default: [] },
    events: { type: [EventPromoSchema], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
