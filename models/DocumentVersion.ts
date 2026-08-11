import mongoose, { Document, Model, Schema } from "mongoose";

export interface IDocumentVersion extends Document {
  documentId: mongoose.Types.ObjectId;
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

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: "Document", required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    storageKey: { type: String, required: true },
    storageUrl: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    version: { type: Number, required: true },
  },
  { timestamps: true }
);

DocumentVersionSchema.index({ documentId: 1 });

const DocumentVersion: Model<IDocumentVersion> =
  mongoose.models.DocumentVersion || mongoose.model<IDocumentVersion>("DocumentVersion", DocumentVersionSchema);

export default DocumentVersion;
