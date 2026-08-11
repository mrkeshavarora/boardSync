import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDocument extends Document {
  meetingId?: mongoose.Types.ObjectId;
  agendaItemId?: mongoose.Types.ObjectId;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  storageUrl: string;
  uploadedBy: mongoose.Types.ObjectId;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: "Meeting" },
    agendaItemId: { type: Schema.Types.ObjectId, ref: "AgendaItem" },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storageKey: { type: String, required: true },
    storageUrl: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true }
);

DocumentSchema.index({ meetingId: 1 });

const MeetingDocument: Model<IDocument> =
  mongoose.models.Document || mongoose.model<IDocument>("Document", DocumentSchema);

export default MeetingDocument;
