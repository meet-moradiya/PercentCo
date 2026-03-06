import mongoose, { Schema, Document } from "mongoose";

export interface IReservation extends Document {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  occasion: string;
  requests: string;
  tableNumber: number | null;
  status: "pending" | "confirmed" | "seated" | "completed" | "no-show" | "cancelled";
  createdAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true, trim: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    guests: { type: Number, required: true, min: 1, max: 20, default: 2 },
    occasion: { type: String, default: "None" },
    requests: { type: String, default: "" },
    tableNumber: { type: Number, default: null },
    status: {
      type: String,
      enum: ["pending", "confirmed", "seated", "completed", "no-show", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Index for fast availability queries
ReservationSchema.index({ date: 1, time: 1, status: 1 });

export default mongoose.models.Reservation ||
  mongoose.model<IReservation>("Reservation", ReservationSchema);
