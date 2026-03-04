import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations";
import { sendVerificationEmail } from "@/lib/mail";
import { generatePin, badRequest, conflict, created, serverError } from "@/lib/utils";
import { rateLimit, getClientIp, tooManyRequests } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 registrations per IP per hour
    const ip = getClientIp(request);
    const rl = rateLimit({ namespace: "register", identifier: ip, limit: 5, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return tooManyRequests(rl.resetAt) as ReturnType<typeof tooManyRequests>;

    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0].message);
    }

    const { name, email, password } = parsed.data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return conflict("An account with this email already exists.");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate 6-char verification PIN
    const verificationToken = generatePin();
    const verificationTokenExpiry = new Date(
      Date.now() + parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_MS ?? "86400000")
    );

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpiry,
      },
    });

    // Send verification email (non-blocking in production)
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (mailError) {
      console.error("[register] Email send failed:", mailError);
    }

    return created(
      { id: user.id, email: user.email, name: user.name },
      "Account created! Please check your email to verify your account."
    );
  } catch (err) {
    console.error("[register]", err);
    return serverError();
  }
}
