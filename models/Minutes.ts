import mongoose, { Document, Model, Schema } from "mongoose";

export type MinutesStatus = "Draft" | "Review" | "Approved" | "Published" | "Archived";

export interface IMoMAgendaItem {
  title: string;
  discussionSummary: string;
  decision: string;
}

export interface IMoMResolution {
  title: string;
  description: string;
  status: string;
}

export interface IMoMActionItem {
  task: string;
  assignedTo: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High";
  status: "Open" | "Completed";
}

export interface IMoMAttendee {
  userId?: mongoose.Types.ObjectId;
  name: string;
  role: string;
  attendanceStatus: "Present" | "Absent" | "Excused";
}

export interface IMinutes extends Document {
  meetingId: mongoose.Types.ObjectId;
  content: string;                    // Legacy plain-text fallback
  status: MinutesStatus;
  draftedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  publishedAt?: Date;
  distributedAt?: Date;

  // AI-generated structured fields
  generatedByAI: boolean;
  transcript?: string;                // Raw Whisper output
  recordingUrl?: string;              // Cloudinary URL to audio file

  meetingSummary?: string;
  callToOrder?: string;
  quorum?: string;

  attendees: IMoMAttendee[];
  absentees: string[];                // Names of absent members

  agendaItems: IMoMAgendaItem[];
  keyDecisions: string[];
  resolutions: IMoMResolution[];
  actionItems: IMoMActionItem[];

  nextMeeting?: string;
  closingRemarks?: string;

  createdAt: Date;
  updatedAt: Date;
}

const MoMAgendaItemSchema = new Schema<IMoMAgendaItem>(
  {
    title: { type: String, required: true },
    discussionSummary: { type: String, default: "" },
    decision: { type: String, default: "" },
  },
  { _id: false }
);

const MoMResolutionSchema = new Schema<IMoMResolution>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    status: { type: String, default: "Passed" },
  },
  { _id: false }
);

const MoMActionItemSchema = new Schema<IMoMActionItem>(
  {
    task: { type: String, required: true },
    assignedTo: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
    status: { type: String, enum: ["Open", "Completed"], default: "Open" },
  },
  { _id: false }
);

const MoMAttendeeSchema = new Schema<IMoMAttendee>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    role: { type: String, default: "" },
    attendanceStatus: { type: String, enum: ["Present", "Absent", "Excused"], default: "Present" },
  },
  { _id: false }
);

const MinutesSchema = new Schema<IMinutes>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true, unique: true },
    content: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Draft", "Review", "Approved", "Published", "Archived"],
      default: "Draft",
    },
    draftedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    publishedAt: { type: Date },
    distributedAt: { type: Date },

    // AI fields
    generatedByAI: { type: Boolean, default: false },
    transcript: { type: String },
    recordingUrl: { type: String },

    meetingSummary: { type: String },
    callToOrder: { type: String },
    quorum: { type: String },

    attendees: { type: [MoMAttendeeSchema], default: [] },
    absentees: { type: [String], default: [] },

    agendaItems: { type: [MoMAgendaItemSchema], default: [] },
    keyDecisions: { type: [String], default: [] },
    resolutions: { type: [MoMResolutionSchema], default: [] },
    actionItems: { type: [MoMActionItemSchema], default: [] },

    nextMeeting: { type: String },
    closingRemarks: { type: String },
  },
  { timestamps: true }
);

MinutesSchema.index({ meetingId: 1 });
MinutesSchema.index({ status: 1 });

const Minutes: Model<IMinutes> =
  mongoose.models.Minutes || mongoose.model<IMinutes>("Minutes", MinutesSchema);

export default Minutes;
