/**
 * This utility provides fallback functionality when the MongoDB connection fails
 * It creates in-memory collections that can be used during development
 */

// In-memory storage
const collections = {
  users: [],
  events: [],
  tickets: [],
  organizers: [],
};

// Generic CRUD operations for when DB is down
export const createFallbackModel = (collectionName) => {
  // Create an ID generator
  const generateId = () =>
    Math.random().toString(36).substring(2) + Date.now().toString(36);

  // Return object with CRUD methods
  return {
    // Create
    create: async (data) => {
      const newItem = {
        ...data,
        _id: generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      collections[collectionName].push(newItem);
      return newItem;
    },

    // Read
    find: async (query = {}) => {
      return collections[collectionName].filter((item) => {
        return Object.keys(query).every((key) => {
          if (typeof query[key] === "object" && query[key] !== null) {
            // Handle basic MongoDB operators
            if (query[key].$eq) return item[key] === query[key].$eq;
            if (query[key].$gt) return item[key] > query[key].$gt;
            if (query[key].$lt) return item[key] < query[key].$lt;
            if (query[key].$in) return query[key].$in.includes(item[key]);
          }
          return item[key] === query[key];
        });
      });
    },

    findById: async (id) => {
      return collections[collectionName].find((item) => item._id === id);
    },

    findOne: async (query) => {
      return collections[collectionName].find((item) => {
        return Object.keys(query).every((key) => item[key] === query[key]);
      });
    },

    // Update
    findByIdAndUpdate: async (id, update) => {
      const index = collections[collectionName].findIndex(
        (item) => item._id === id
      );
      if (index !== -1) {
        collections[collectionName][index] = {
          ...collections[collectionName][index],
          ...update,
          updatedAt: new Date(),
        };
        return collections[collectionName][index];
      }
      return null;
    },

    // Delete
    findByIdAndDelete: async (id) => {
      const index = collections[collectionName].findIndex(
        (item) => item._id === id
      );
      if (index !== -1) {
        const deleted = collections[collectionName][index];
        collections[collectionName].splice(index, 1);
        return deleted;
      }
      return null;
    },
  };
};

// Export a function to check if we're using fallbacks
export const isFallbackMode = () => {
  return !global.mongoConnected;
};
