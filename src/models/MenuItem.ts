import mongoose, { Schema, Document } from "mongoose";

export interface IMenuItem extends Document {
  name: string;
  description: string;
  price: string;
  category: "starters" | "mains" | "desserts" | "drinks";
  tag: string;
  image: string;
  isJainAvailable: boolean;
  isActive: boolean;
  sortOrder: number;
  station: mongoose.Types.ObjectId | null;
  preCookable: boolean;
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
    image: { type: String, default: "" },
    isJainAvailable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    station: { type: Schema.Types.ObjectId, ref: "Station", default: null },
    preCookable: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.MenuItem ||
  mongoose.model<IMenuItem>("MenuItem", MenuItemSchema);
