/**
 * Validation Utility
 * Use these functions to validate input data
 */

/**
 * Validate email format
 * @param {String} email
 * @returns {Boolean} True if valid email
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {String} password
 * @returns {Object} { isValid, message }
 */
export const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return {
      isValid: false,
      message:
        "Password must contain uppercase, lowercase, number, and special character",
    };
  }

  return { isValid: true, message: "Valid password" };
};

/**
 * Validate phone number format
 * @param {String} phone
 * @returns {Boolean} True if valid phone number
 */
export const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[1-9]\d{9,14}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate date format and ensure it's a future date
 * @param {Date|String} date
 * @returns {Boolean} True if valid future date
 */
export const isValidFutureDate = (date) => {
  const dateObj = new Date(date);
  const now = new Date();

  return dateObj instanceof Date && !isNaN(dateObj) && dateObj > now;
};

/**
 * Validate URL format
 * @param {String} url
 * @returns {Boolean} True if valid URL
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};
