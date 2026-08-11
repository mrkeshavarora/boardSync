import mongoose, { Document, Model, Schema } from "mongoose";

export type MinutesStatus = "Draft" | "Review" | "Approved" | "Archived";

export interface IMinutes extends Document {
  meetingId: mongoose.Types.ObjectId;
  content: string;          // Rich-text / HTML content of the minutes body
  status: MinutesStatus;
  draftedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  distributedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MinutesSchema = new Schema<IMinutes>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Review", "Approved", "Archived"],
      default: "Draft",
    },
    draftedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    distributedAt: { type: Date },
  },
  { timestamps: true }
);

MinutesSchema.index({ meetingId: 1 });

const Minutes: Model<IMinutes> =
  mongoose.models.Minutes || mongoose.model<IMinutes>("Minutes", MinutesSchema);

export default Minutes;
