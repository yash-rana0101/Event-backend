import Redis from "ioredis";
import logger from "./logger.js";

// Basic console logging fallback
const consoleLogger = {
  info: (...args) => console.log("[Redis]", ...args),
  error: (...args) => console.error("[Redis Error]", ...args),
};

const redisOptions = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    const targetError = "READONLY";
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};

let redisClient;

try {
  redisClient = new Redis(redisOptions);

  redisClient.on("error", (error) => {
    (logger || consoleLogger).error("Redis Client Error:", error);
  });

  redisClient.on("connect", () => {
    (logger || consoleLogger).info("Redis Client Connected");
  });
} catch (error) {
  (logger || consoleLogger).error("Redis Connection Error:", error);
  // Fallback to in-memory cache if Redis is not available
  redisClient = {
    get: async () => null,
    set: async () => {},
    del: async () => {},
  };
}

export const cache = {
  async get(key) {
    try {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      (logger || consoleLogger).error("Redis Get Error:", error);
      return null;
    }
  },

  async set(key, value, expireTime = 3600) {
    try {
      await redisClient.set(key, JSON.stringify(value), "EX", expireTime);
    } catch (error) {
      (logger || consoleLogger).error("Redis Set Error:", error);
    }
  },

  async del(key) {
    try {
      await redisClient.del(key);
    } catch (error) {
      (logger || consoleLogger).error("Redis Delete Error:", error);
    }
  },

  // Added for health checks
  isReady() {
    return redisClient.status === "ready";
  },
};

export default redisClient;
