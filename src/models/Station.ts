import mongoose, { Schema, Document } from "mongoose";

export interface IStation extends Document {
  name: string;
  slug: string;
  servePhase: 1 | 2 | 3; // 1=Immediate, 2=Main Course, 3=Dessert
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

const StationSchema = new Schema<IStation>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    servePhase: { type: Number, required: true, enum: [1, 2, 3], default: 2 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export default mongoose.models.Station ||
  mongoose.model<IStation>("Station", StationSchema);
