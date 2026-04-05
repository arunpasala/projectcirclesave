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
    subject: "💰 Your CircleSave Login OTP",
    html: `
      <div style="font-family: Arial, sans-serif; background: #f4f8f3; padding: 20px;">
        <div style="
          max-width: 480px;
          margin: auto;
          background: #ffffff;
          border-radius: 10px;
          padding: 24px;
          border: 1px solid #d7e8d0;
        ">
          <h2 style="color: #15803d; text-align: center; margin-bottom: 10px;">
            💵 CircleSave Login OTP
          </h2>

          <p style="font-size: 15px; color: #444; text-align: center;">
            Use the secure code below to continue.
          </p>

          <div style="
            margin: 20px auto;
            text-align: center;
            font-size: 30px;
            font-weight: bold;
            letter-spacing: 6px;
            color: #15803d;
            background: #e9f7e5;
            border: 1px solid #b7dfb0;
            padding: 12px 0;
            border-radius: 8px;
            width: 240px;
          ">
            ${otp}
          </div>

          <p style="font-size: 14px; color: #555; text-align: center;">
            This OTP expires in <strong>10 minutes</strong>.  
            Keep it private and do not share it with anyone.
          </p>

          <p style="font-size: 13px; color: #777; text-align: center; margin-top: 20px;">
            CircleSave • Smart Savings, Trusted Circles
          </p>
        </div>
      </div>
    `,
  });
}
