/**
 * Standardized API response formatting
 */
class ApiResponse {
  /**
   * Send a success response
   * @param {object} res - Express response object
   * @param {string} message - Success message
   * @param {any} data - Response data
   * @param {number} statusCode - HTTP status code (default: 200)
   */
  static success(res, message = "Success", data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send a created response (201)
   * @param {object} res - Express response object
   * @param {string} message - Success message
   * @param {any} data - Response data
   */
  static created(res, message = "Resource created", data = null) {
    return this.success(res, message, data, 201);
  }

  /**
   * Send an error response
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  static error(res, message = "Error occurred", statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  /**
   * Send a bad request error response (400)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static badRequest(res, message = "Bad request") {
    return this.error(res, message, 400);
  }

  /**
   * Send an unauthorized error response (401)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static unauthorized(res, message = "Unauthorized") {
    return this.error(res, message, 401);
  }

  /**
   * Send a forbidden error response (403)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static forbidden(res, message = "Forbidden") {
    return this.error(res, message, 403);
  }

  /**
   * Send a not found error response (404)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static notFound(res, message = "Resource not found") {
    return this.error(res, message, 404);
  }

  /**
   * Send a server error response (500)
   * @param {object} res - Express response object
   * @param {string} message - Error message
   */
  static serverError(res, message = "Internal server error") {
    return this.error(res, message, 500);
  }
}

export default ApiResponse;
