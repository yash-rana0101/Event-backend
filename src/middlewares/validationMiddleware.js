import Joi from "joi";

// Define validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().allow("", null),
    organization: Joi.string(),
  }),
  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),
  updateProfile: Joi.object({
    name: Joi.string().min(3).max(50),
    email: Joi.string().email(),
    phone: Joi.string().allow("", null),
    bio: Joi.string().allow("", null),
  }),
};

// Validation middleware
export const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      return res.status(500).json({
        success: false,
        message: "Invalid validation schema",
      });
    }

    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      }));
      console.log("Validation Error", details); 
      return res.status(400).json({
        status: "error",
        message: "Validation Error",
        details,
      });
    }

   next();
  };
};
