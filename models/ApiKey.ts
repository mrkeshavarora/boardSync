import mongoose, { Schema, Model } from "mongoose";

export type ApiProvider = "openai" | "grok" | "gemini" | "custom";

export interface IApiKey {
  _id?: string;
  provider: ApiProvider;
  keyName: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    provider: {
      type: String,
      enum: ["openai", "grok", "gemini", "custom"],
      required: [true, "Provider is required"],
    },
    keyName: {
      type: String,
      required: [true, "Key name is required"],
      trim: true,
    },
    apiKey: {
      type: String,
      required: [true, "API key is required"],
      trim: true,
    },
    model: {
      type: String,
      trim: true,
      default: "",
    },
    baseUrl: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

const ApiKey: Model<IApiKey> =
  mongoose.models.ApiKey || mongoose.model<IApiKey>("ApiKey", ApiKeySchema);

export default ApiKey;
