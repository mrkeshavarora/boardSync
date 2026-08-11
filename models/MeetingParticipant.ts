import mongoose, { Document, Model, Schema } from "mongoose";

export interface IMeetingParticipant extends Document {
  meetingId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: string;
  invitationStatus: "Pending" | "Sent" | "Failed";
  invitedAt?: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingParticipantSchema = new Schema<IMeetingParticipant>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, required: true },
    invitationStatus: {
      type: String,
      enum: ["Pending", "Sent", "Failed"],
      default: "Pending",
    },
    invitedAt: { type: Date },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

MeetingParticipantSchema.index({ meetingId: 1 });
MeetingParticipantSchema.index({ userId: 1 });

const MeetingParticipant: Model<IMeetingParticipant> =
  mongoose.models.MeetingParticipant || mongoose.model<IMeetingParticipant>("MeetingParticipant", MeetingParticipantSchema);

export default MeetingParticipant;
