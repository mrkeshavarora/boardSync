import mongoose, { Document, Model, Schema } from "mongoose";

export type ConnectionStatus = "Pending" | "Accepted" | "Rejected";

export interface IConnection extends Document {
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  status: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ConnectionSchema = new Schema<IConnection>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Rejected"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

ConnectionSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
ConnectionSchema.index({ fromUserId: 1 });
ConnectionSchema.index({ toUserId: 1 });

const Connection: Model<IConnection> =
  mongoose.models.Connection || mongoose.model<IConnection>("Connection", ConnectionSchema);

export default Connection;
