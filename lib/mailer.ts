import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: "Your CircleSave Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>CircleSave Login OTP</h2>
        <p>Your OTP is:</p>
        <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">
          ${otp}
        </div>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `,
  });
}