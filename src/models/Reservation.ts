import mongoose, { Schema, Document } from "mongoose";

export interface IReservation extends Document {
  firstName: string;
  lastName: string;
  name: string; // virtual: firstName + lastName
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  occasion: string;
  requests: string;
  tableNumber: number | null;
  status: "pending" | "confirmed" | "seated" | "completed" | "no-show" | "cancelled";
  seatedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

const ReservationSchema = new Schema<IReservation>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, default: "", trim: true },
    name: { type: String, default: "" }, // kept for backward compat, auto-set via pre-save
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
    seatedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-set the `name` field from firstName + lastName before saving
ReservationSchema.pre("save", function () {
  if (this.firstName) {
    this.name = this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
  }
});

// Also update name on findOneAndUpdate operations
ReservationSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() as Record<string, unknown> | null;
  if (update) {
    const firstName = update.firstName as string | undefined;
    const lastName = update.lastName as string | undefined;
    if (firstName !== undefined) {
      (update as Record<string, unknown>).name = lastName ? `${firstName} ${lastName}` : firstName;
    }
  }
});

// Index for fast availability queries
ReservationSchema.index({ date: 1, time: 1, status: 1 });
// Index for analytics queries
ReservationSchema.index({ phone: 1 });
ReservationSchema.index({ status: 1, date: 1 });

export default mongoose.models.Reservation ||
  mongoose.model<IReservation>("Reservation", ReservationSchema);
