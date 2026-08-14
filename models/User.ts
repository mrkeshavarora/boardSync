import mongoose, { Document, Model, Schema } from "mongoose";

export type UserRole = "super_admin" | "board_member";
export type UserStatus = "active" | "inactive" | "pending";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  department?: string;
  title?: string;
  bio?: string;
  lastLogin?: Date;
  emailVerified?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ["super_admin", "board_member"],
      default: "board_member",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
    avatar: { type: String },
    phone: { type: String },
    department: { type: String },
    title: { type: String },
    bio: { type: String },
    lastLogin: { type: Date },
    emailVerified: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
