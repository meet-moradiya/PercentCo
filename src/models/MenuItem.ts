import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  name: string;
  description: string;
  price: string;
  category: "starters" | "mains" | "desserts" | "drinks";
  tag: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
}

const MenuItemSchema = new Schema<IMenuItem>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["starters", "mains", "desserts", "drinks"],
    },
    tag: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);
