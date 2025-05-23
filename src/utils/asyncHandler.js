/**
 * Async handler utility to catch errors in async route handlers
 * @param {Function} fn - The async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
