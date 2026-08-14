import mongoose, { Document, Model, Schema } from "mongoose";

export interface IRole extends Document {
  name: string;
  permissions: string[];
  description?: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      enum: ["super_admin", "board_member"],
    },
    permissions: [{ type: String }],
    description: { type: String },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Role: Model<IRole> =
  mongoose.models.Role || mongoose.model<IRole>("Role", RoleSchema);

export default Role;
