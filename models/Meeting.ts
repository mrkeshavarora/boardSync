import mongoose, { Document, Model, Schema } from "mongoose";

export type MeetingStatus = "Draft" | "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "Archived";

export interface IMeeting extends Document {
  title: string;
  description?: string;
  meetingType: string;
  date: Date;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  onlineMeeting?: string;
  organizerId: mongoose.Types.ObjectId;
  status: MeetingStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    meetingType: { type: String, required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    timezone: { type: String, required: true },
    location: { type: String },
    onlineMeeting: { type: String },
    organizerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "In Progress", "Completed", "Cancelled", "Archived"],
      default: "Draft",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

MeetingSchema.index({ date: 1 });
MeetingSchema.index({ status: 1 });
MeetingSchema.index({ organizerId: 1 });

const Meeting: Model<IMeeting> = mongoose.models.Meeting || mongoose.model<IMeeting>("Meeting", MeetingSchema);

export default Meeting;
