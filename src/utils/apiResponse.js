/**
 * Standard API Response Utility
 */
class ApiResponse {
  constructor(statusCode, message, data = null, success = true) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = success;
  }

  static success(res, message, data = null, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res, message, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }

  static notFound(res, message = "Resource not found") {
    return this.error(res, message, 404);
  }

  static badRequest(res, message = "Invalid request") {
    return this.error(res, message, 400);
  }

  static unauthorized(res, message = "Unauthorized access") {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = "Forbidden access") {
    return this.error(res, message, 403);
  }
}

export default ApiResponse;
