import { createWelcomeEmailTemplate } from "./emailTemplates.js";
import { resendClient, sender } from "../lib/resend.js";

export const sendWelcomeEmail = async (email, name, clientURL) => {
  const { data, error } = await resendClient.emails.send({
    // from: `${sender.name} <${sender.email}>`, // hardcoded for now
    from: "Jeon Maps <onboarding@resend.dev>",
    // to: email, // Uncomment this line to send to the actual user email
    to: "jeonmapatac@gmail.com", // hardcoded since i can only send to verified emails in resend free tier
    subject: "Welcome to Chatify!",
    html: createWelcomeEmailTemplate(name, clientURL),
  });

  if (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
};
