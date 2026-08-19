import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env");
}

// Enable Mongoose command buffering globally
mongoose.set("bufferCommands", true);

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache;
  // eslint-disable-next-line no-var
  var mongooseCacheListenersAdded: boolean;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

// Auto-reset cache if connection drops or resets
if (!global.mongooseCacheListenersAdded) {
  mongoose.connection.on("error", () => {
    cached.conn = null;
    cached.promise = null;
  });
  mongoose.connection.on("disconnected", () => {
    cached.conn = null;
    cached.promise = null;
  });
  global.mongooseCacheListenersAdded = true;
}

async function connectDB(): Promise<typeof mongoose> {
  // Return active connection if readyState === 1 (Connected)
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Reset cached connection if disconnected or disconnecting
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      family: 4,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.conn = null;
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}

export default connectDB;
