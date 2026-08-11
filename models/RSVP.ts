import mongoose, { Document, Model, Schema } from "mongoose";

export type RSVPStatus = "Pending" | "Accepted" | "Tentative" | "Declined";

export interface IRSVP extends Document {
  meetingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: RSVPStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RSVPSchema = new Schema<IRSVP>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Pending", "Accepted", "Tentative", "Declined"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

RSVPSchema.index({ meetingId: 1 });
RSVPSchema.index({ userId: 1 });

const RSVP: Model<IRSVP> = mongoose.models.RSVP || mongoose.model<IRSVP>("RSVP", RSVPSchema);

export default RSVP;
