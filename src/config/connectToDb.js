import mongoose from "mongoose";
import { logInfo, logError } from "../utils/logger.js";

const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI ||
      "mongodb+srv://yash1010:U89nqcFHgP6jgk4b@yash.sedi2.mongodb.net/EventDB?retryWrites=true&w=majority";
    
    const conn = await mongoose.connect(mongoURI);

    console.log(`MongoDB is connected `);

    return conn;
  } catch (error) {
    logError("MongoDB connection error", { error: error.message });
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
