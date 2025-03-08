/**
 * Pagination Utility
 * Use this utility to paginate query results
 */

/**
 * Paginate mongoose query results
 * @param {Object} model - Mongoose model
 * @param {Object} query - Query object
 * @param {Object} options - Pagination options
 * @param {Number} options.page - Page number (default: 1)
 * @param {Number} options.limit - Items per page (default: 10)
 * @param {String} options.sort - Sort field (default: 'createdAt')
 * @param {Number} options.sortOrder - Sort order (1 for ascending, -1 for descending, default: -1)
 * @returns {Object} Paginated results
 */
export const paginate = async (model, query = {}, options = {}) => {
  const page = parseInt(options.page) || 1;
  const limit = parseInt(options.limit) || 10;
  const skip = (page - 1) * limit;
  const sortField = options.sort || "createdAt";
  const sortOrder = options.sortOrder || -1;

  const sortCriteria = {};
  sortCriteria[sortField] = sortOrder;

  // Count total documents matching the query
  const totalDocs = await model.countDocuments(query);
  const totalPages = Math.ceil(totalDocs / limit);

  // Get paginated data
  const data = await model
    .find(query)
    .sort(sortCriteria)
    .skip(skip)
    .limit(limit);

  return {
    data,
    meta: {
      totalDocs,
      limit,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
    },
  };
};

/**
 * Extract pagination parameters from request
 * @param {Object} req - Express request object
 * @returns {Object} Pagination options
 */
export const getPaginationOptions = (req) => {
  return {
    page: req.query.page,
    limit: req.query.limit,
    sort: req.query.sort,
    sortOrder: req.query.sortOrder === "asc" ? 1 : -1,
  };
};

export default { paginate, getPaginationOptions };
