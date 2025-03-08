import jwt from "jsonwebtoken";

/**
 * Token Service Utility
 * Use this utility to generate and verify JWTs for authentication
 */
class TokenService {
  /**
   * Generate JWT token
   * @param {Object} payload - Data to encode in the token
   * @param {String} expiresIn - Token expiry time (e.g., '1h', '7d', '30d')
   * @returns {String} JWT token
   */
  static generateToken(payload, expiresIn = "30d") {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn,
    });
  }

  /**
   * Generate access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} Object containing access and refresh tokens
   */
  static generateAuthTokens(user) {
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.generateToken(payload, "1d"),
      refreshToken: this.generateToken(payload, "30d"),
    };
  }

  /**
   * Verify token
   * @param {String} token - JWT token to verify
   * @returns {Object|Boolean} Decoded token payload or false if invalid
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      console.error("Token verification error:", error.message);
      return false;
    }
  }
}

export default TokenService;
