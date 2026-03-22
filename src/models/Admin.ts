import mongoose, { Schema, Document } from "mongoose";

export type AdminRole = "admin" | "chef" | "waiter";

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: AdminRole;
  activeStations: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Admin" },
    role: { type: String, enum: ["admin", "chef", "waiter"], default: "admin" },
    activeStations: { type: [Schema.Types.ObjectId], ref: "Station", default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Admin ||
  mongoose.model<IAdmin>("Admin", AdminSchema);

