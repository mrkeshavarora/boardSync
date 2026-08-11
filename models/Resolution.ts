import mongoose, { Document, Model, Schema } from "mongoose";

export type ResolutionStatus = "Proposed" | "Seconded" | "Passed" | "Failed" | "Deferred" | "Withdrawn";

export interface IResolution extends Document {
  meetingId: mongoose.Types.ObjectId;
  agendaItemId?: mongoose.Types.ObjectId;
  resolutionNumber: string;  // e.g., "RES-2026-001"
  title: string;
  description: string;
  proposedBy: mongoose.Types.ObjectId;
  secondedBy?: mongoose.Types.ObjectId;
  status: ResolutionStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResolutionSchema = new Schema<IResolution>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    agendaItemId: { type: Schema.Types.ObjectId, ref: "AgendaItem" },
    resolutionNumber: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    secondedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: ["Proposed", "Seconded", "Passed", "Failed", "Deferred", "Withdrawn"],
      default: "Proposed",
    },
    votesFor: { type: Number, default: 0 },
    votesAgainst: { type: Number, default: 0 },
    votesAbstain: { type: Number, default: 0 },
    notes: { type: String },
  },
  { timestamps: true }
);

ResolutionSchema.index({ meetingId: 1 });
ResolutionSchema.index({ resolutionNumber: 1 });

const Resolution: Model<IResolution> =
  mongoose.models.Resolution || mongoose.model<IResolution>("Resolution", ResolutionSchema);

export default Resolution;
