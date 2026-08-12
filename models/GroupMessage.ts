import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGroupMessage extends Document {
  groupId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

const GroupMessageSchema = new Schema<IGroupMessage>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

GroupMessageSchema.index({ groupId: 1, createdAt: 1 });

const GroupMessage: Model<IGroupMessage> =
  mongoose.models.GroupMessage ||
  mongoose.model<IGroupMessage>("GroupMessage", GroupMessageSchema);

export default GroupMessage;
