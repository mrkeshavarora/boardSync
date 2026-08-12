import mongoose, { Document, Model, Schema } from "mongoose";

export type MeetingStatus = "Draft" | "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "Archived";

export interface ITranscriptSegment {
  speakerId?: string;
  speakerName: string;
  text: string;
  timestamp: string;
  startTime?: string;
  endTime?: string;
}

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

  // Real-time Live Transcription & AI Minutes
  transcript: ITranscriptSegment[];
  summary?: string;
  keyDiscussionPoints?: string[];
  decisions?: string[];
  actionItems?: Array<{ task: string; owner: string; deadline: string }>;
  risks?: string[];
  followUps?: string[];
}

const TranscriptSegmentSchema = new Schema<ITranscriptSegment>(
  {
    speakerId: { type: String },
    speakerName: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, required: true },
    startTime: { type: String },
    endTime: { type: String },
  },
  { _id: false }
);

const ActionItemSchema = new Schema(
  {
    task: { type: String, required: true },
    owner: { type: String },
    deadline: { type: String },
  },
  { _id: false }
);

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

    // Transcription & AI fields
    transcript: { type: [TranscriptSegmentSchema], default: [] },
    summary: { type: String },
    keyDiscussionPoints: { type: [String], default: [] },
    decisions: { type: [String], default: [] },
    actionItems: { type: [ActionItemSchema], default: [] },
    risks: { type: [String], default: [] },
    followUps: { type: [String], default: [] },
  },
  { timestamps: true }
);

MeetingSchema.index({ date: 1 });
MeetingSchema.index({ status: 1 });
MeetingSchema.index({ organizerId: 1 });

const Meeting: Model<IMeeting> = mongoose.models.Meeting || mongoose.model<IMeeting>("Meeting", MeetingSchema);

export default Meeting;
