import { OAuth2Client } from "google-auth-library";
import { config } from "../config/config.js";

const client = new OAuth2Client(
  config.google.clientId,
  config.google.clientSecret,
  config.google.redirectUri
);

export const verifyGoogleToken = async (token) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.google.clientId,
    });

    const payload = ticket.getPayload();
    return {
      success: true,
      data: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        emailVerified: payload.email_verified,
      },
    };
  } catch (error) {
    console.error("Google token verification failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const generateAuthUrl = () => {
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "consent",
  });
  return authUrl;
};

export const getTokenFromCode = async (code) => {
  try {
    const { tokens } = await client.getToken(code);
    return {
      success: true,
      tokens,
    };
  } catch (error) {
    console.error("Failed to get tokens from code:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
