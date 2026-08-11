import mongoose, { Document, Model, Schema } from "mongoose";

export interface IActionItem extends Document {
  meetingId: mongoose.Types.ObjectId;
  resolutionId?: mongoose.Types.ObjectId;
  agendaItemId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  assignedTo: mongoose.Types.ObjectId;
  dueDate?: Date;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Completed" | "Cancelled" | "Overdue";
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActionItemSchema = new Schema<IActionItem>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
    resolutionId: { type: Schema.Types.ObjectId, ref: "Resolution" },
    agendaItemId: { type: Schema.Types.ObjectId, ref: "AgendaItem" },
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Completed", "Cancelled", "Overdue"],
      default: "Open",
    },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ActionItemSchema.index({ meetingId: 1 });
ActionItemSchema.index({ assignedTo: 1 });
ActionItemSchema.index({ status: 1 });
ActionItemSchema.index({ dueDate: 1 });

const ActionItem: Model<IActionItem> =
  mongoose.models.ActionItem || mongoose.model<IActionItem>("ActionItem", ActionItemSchema);

export default ActionItem;
