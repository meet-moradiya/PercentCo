import mongoose, { Schema, Document } from "mongoose";

export interface ITableCode extends Document {
  tableNumber: number;
  code: string;
  email: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

const TableCodeSchema = new Schema<ITableCode>(
  {
    tableNumber: { type: Number, required: true },
    code: { type: String, required: true },
    email: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Only one active code per table at a time
TableCodeSchema.index({ tableNumber: 1, isActive: 1 });
// Auto-expire old codes
TableCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.TableCode ||
  mongoose.model<ITableCode>("TableCode", TableCodeSchema);
