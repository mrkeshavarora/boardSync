import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  otp: z.string().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email }).select(
          "+password +twoFactorCode +twoFactorExpires +twoFactorEnabled"
        );
        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.password);
        if (!isValid) return null;

        if (user.status === "pending") {
          throw new Error("PendingApproval");
        }
        if (user.status === "inactive") {
          throw new Error("InactiveAccount");
        }

        if (user.twoFactorEnabled) {
          const otpInput = parsed.data.otp?.trim();
          if (!otpInput) {
            throw new Error("RequireOTP");
          }
          if (!user.twoFactorCode || user.twoFactorCode !== otpInput) {
            throw new Error("InvalidOTP");
          }
          if (!user.twoFactorExpires || user.twoFactorExpires < new Date()) {
            throw new Error("ExpiredOTP");
          }
        }

        await User.findByIdAndUpdate(user._id, {
          lastLogin: new Date(),
          twoFactorCode: null,
          twoFactorExpires: null,
        });

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar ?? null,
        };
      },
    }),
  ],
});
