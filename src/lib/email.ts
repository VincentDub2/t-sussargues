import nodemailer from "nodemailer";

type InvitationEmailInput = {
  email: string;
  firstName: string;
  invitationUrl: string;
  invitedByName: string;
};

type InvitationEmailResult =
  | { status: "sent" }
  | { status: "dev_preview"; previewUrl: string };

function isSmtpConfigured() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  return Boolean(
    host &&
      port &&
      user &&
      password &&
      host !== "smtp.example.com" &&
      user !== "user@example.com" &&
      password !== "replace-with-your-smtp-password"
  );
}

function getInvitationSubject() {
  return "Invitation a rejoindre l'application T-Sussargues";
}

function getInvitationText({
  firstName,
  invitationUrl,
  invitedByName,
}: InvitationEmailInput) {
  return [
    `Bonjour ${firstName},`,
    "",
    `${invitedByName} vous a invite a rejoindre l'application T-Sussargues.`,
    "",
    "Cliquez sur le lien suivant pour definir votre mot de passe :",
    invitationUrl,
    "",
    "Ce lien expire dans 7 jours.",
  ].join("\n");
}

export async function sendInvitationEmail(
  input: InvitationEmailInput
): Promise<InvitationEmailResult> {
  if (!isSmtpConfigured()) {
    return {
      status: "dev_preview",
      previewUrl: input.invitationUrl,
    };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: input.email,
    subject: getInvitationSubject(),
    text: getInvitationText(input),
  });

  return { status: "sent" };
}
