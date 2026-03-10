import { Resend } from "resend";
import { connectDB } from "@/lib/mongodb";
import TableCode from "@/models/TableCode";

let resend: Resend | null = null;
function getResend(): Resend {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

/**
 * Generate a 6-digit numeric code.
 */
function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new table code, deactivate any previous code for this table,
 * and send the code to the customer's email.
 *
 * Returns the code string on success, or throws on email failure.
 */
export async function createAndSendTableCode(
  tableNumber: number,
  email: string,
  customerName: string
): Promise<string> {
  await connectDB();

  // Deactivate all previous codes for this table
  await TableCode.updateMany(
    { tableNumber, isActive: true },
    { isActive: false }
  );

  const code = generateCode();

  // Code expires in 12 hours (a full restaurant session)
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

  await TableCode.create({
    tableNumber,
    code,
    email: email.toLowerCase().trim(),
    isActive: true,
    expiresAt,
  });

  // Send email via Resend
  await getResend().emails.send({
    from: FROM_EMAIL,
    to: email.toLowerCase().trim(),
    subject: `Your Order Code for Table ${tableNumber} — PercentCo`,
    html: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #ededed; padding: 40px 30px; border-radius: 0;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; color: #c9a96e; font-size: 24px; margin: 0 0 8px;">
          PercentCo
        </h1>
        <p style="color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 30px;">
          Order Verification Code
        </p>
        <p style="color: #ededed; font-size: 15px; margin: 0 0 24px;">
          Hello <strong>${customerName}</strong>, welcome to PercentCo!
        </p>
        <p style="color: #888; font-size: 14px; margin: 0 0 20px;">
          You are seated at <strong style="color: #c9a96e;">Table ${tableNumber}</strong>. Use the code below to place orders from your table:
        </p>
        <div style="background: #141414; border: 1px solid #2a2a2a; text-align: center; padding: 24px; margin: 0 0 24px;">
          <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px;">Your Code</p>
          <p style="font-size: 40px; font-weight: bold; color: #c9a96e; letter-spacing: 10px; margin: 0;">
            ${code}
          </p>
        </div>
        <p style="color: #666; font-size: 12px; margin: 0;">
          This code is valid for your current visit. Do not share it with others.
        </p>
      </div>
    `,
  });

  return code;
}

/**
 * Verify a code for a given table number.
 * Returns true if the code is valid and active.
 */
export async function verifyTableCode(
  tableNumber: number,
  code: string
): Promise<boolean> {
  await connectDB();

  const tableCode = await TableCode.findOne({
    tableNumber,
    code,
    isActive: true,
    expiresAt: { $gt: new Date() },
  });

  return !!tableCode;
}
