import nodemailer from "nodemailer";

type SendMailArgs = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function mustEnv(key: string) {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export async function sendMail({ to, subject, text, html }: SendMailArgs) {
  const host = mustEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || "587");
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  const user = mustEnv("SMTP_USER");
  const pass = mustEnv("SMTP_PASS");
  const from = process.env.MAIL_FROM || `CircleSave <${user}>`;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  // helps catch config issues early
  await transporter.verify();

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html ?? undefined,
  });
}