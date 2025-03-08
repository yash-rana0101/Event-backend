import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const config = {
  port: process.env.PORT,
  mongoURI: process.env.MONGO_URI ,
  jwtSecret:
    process.env.JWT_SECRET,
  environment: process.env.NODE_ENV,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
};

export default config;
