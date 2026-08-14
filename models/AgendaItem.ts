import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAgendaItem extends Document {
  meetingId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  presenterId?: mongoose.Types.ObjectId;
  presenterName?: string;
  estimatedDuration?: number; // in minutes
  priority?: "Low" | "Medium" | "High";
  status: "Pending" | "In Progress" | "Completed" | "Skipped";
  documentIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const AgendaItemSchema = new Schema<IAgendaItem>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    title: { type: String, required: true },
    description: { type: String },
    order: { type: Number, required: true },
    presenterId: { type: Schema.Types.ObjectId, ref: "User" },
    presenterName: { type: String },
    estimatedDuration: { type: Number },
    priority: { type: String, enum: ["Low", "Medium", "High"] },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Skipped"],
      default: "Pending",
    },
    documentIds: [{ type: Schema.Types.ObjectId, ref: "Document" }],
  },
  { timestamps: true }
);

AgendaItemSchema.index({ meetingId: 1 });

const AgendaItem: Model<IAgendaItem> =
  mongoose.models.AgendaItem || mongoose.model<IAgendaItem>("AgendaItem", AgendaItemSchema);

export default AgendaItem;
