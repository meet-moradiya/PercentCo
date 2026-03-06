import mongoose, { Schema, Document } from "mongoose";

export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.Admin ||
  mongoose.model<IAdmin>("Admin", AdminSchema);
