import nodemailer from "nodemailer";

/**
 * Email Service Utility
 * Use this utility to send emails for notifications, password resets, etc.
 */
export const sendEmail = async (options) => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  // Send email
  const info = await transporter.sendMail(mailOptions);

  console.log(`Email sent: ${info.messageId}`);
  return info;
};

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = async (user) => {
  const options = {
    email: user.email,
    subject: "Welcome to Cyber Hunter Events!",
    message: `Hi ${user.name},\n\nWelcome to Cyber Hunter Events! We're excited to have you on board.\n\nBest regards,\nThe Cyber Hunter Events Team`,
    html: `
      <h1>Welcome to Cyber Hunter Events!</h1>
      <p>Hi ${user.name},</p>
      <p>We're excited to have you on board. Get ready for amazing cyber security events!</p>
      <p>Best regards,<br>The Cyber Hunter Events Team</p>
    `,
  };

  await sendEmail(options);
};

/**
 * Send event registration confirmation email
 */
export const sendRegistrationConfirmationEmail = async (user, event) => {
  const options = {
    email: user.email,
    subject: `Registration Confirmation: ${event.title}`,
    message: `Hi ${user.name},\n\nYour registration for ${event.title} has been confirmed. The event will take place on ${new Date(event.startDate).toLocaleDateString()}.\n\nBest regards,\nThe Cyber Hunter Events Team`,
    html: `
      <h1>Registration Confirmation</h1>
      <p>Hi ${user.name},</p>
      <p>Your registration for <strong>${event.title}</strong> has been confirmed.</p>
      <p>Event details:</p>
      <ul>
        <li>Date: ${new Date(event.startDate).toLocaleDateString()}</li>
        <li>Time: ${new Date(event.startDate).toLocaleTimeString()}</li>
        <li>Location: ${event.location}</li>
      </ul>
      <p>Best regards,<br>The Cyber Hunter Events Team</p>
    `,
  };

  await sendEmail(options);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (user, resetUrl) => {
  const options = {
    email: user.email,
    subject: "Password Reset Request",
    message: `Hi ${user.name},\n\nYou requested a password reset. Please use the following link to reset your password: ${resetUrl}\n\nIf you didn't request this, please ignore this email.\n\nBest regards,\nThe Cyber Hunter Events Team`,
    html: `
      <h1>Password Reset Request</h1>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Please click the button below to reset your password:</p>
      <p>
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
      </p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Best regards,<br>The Cyber Hunter Events Team</p>
    `,
  };

  await sendEmail(options);
};

/**
 * Send team invitation email
 */
export const sendTeamInvitationEmail = async (invitee, team, inviter) => {
  const options = {
    email: invitee.email,
    subject: `Team Invitation: ${team.name}`,
    message: `Hi ${invitee.name},\n\nYou have been invited to join the team "${team.name}" by ${inviter.name}. Please log in to your account to accept or decline this invitation.\n\nBest regards,\nThe Cyber Hunter Events Team`,
    html: `
      <h1>Team Invitation</h1>
      <p>Hi ${invitee.name},</p>
      <p>You have been invited to join the team <strong>"${team.name}"</strong> by ${inviter.name}.</p>
      <p>Please log in to your account to accept or decline this invitation.</p>
      <p>Best regards,<br>The Cyber Hunter Events Team</p>
    `,
  };

  await sendEmail(options);
};
