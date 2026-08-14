import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@/models/User";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(["super_admin", "board_member"]),
  department: z.string().optional(),
  title: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["active", "inactive", "pending"]).optional(),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const role = searchParams.get("role");
  const status = searchParams.get("status");
  const search = searchParams.get("search");
  const allowSearch = !!search;

  if (!allowSearch && !hasPermission(session.user.role as UserRole, "users:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();

  const query: Record<string, unknown> = {};
  if (role && role !== "all") query.role = role;
  if (status && status !== "all") query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
    if (!status) query.status = "active";
  }

  const [users, total] = await Promise.all([
    User.find(query).select("-password").skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);

  return NextResponse.json({ users, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role as UserRole, "users:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const exists = await User.findOne({ email: parsed.data.email });
  if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashedPassword = parsed.data.password
    ? await bcrypt.hash(parsed.data.password, 12)
    : undefined;

  const user = await User.create({
    ...parsed.data,
    password: hashedPassword,
    status: parsed.data.status || "active",
  });

  return NextResponse.json({ user: { ...user.toObject(), password: undefined } }, { status: 201 });
}
