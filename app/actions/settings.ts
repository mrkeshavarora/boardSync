"use server";

import { auth } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { revalidatePath } from "next/cache";

export async function updateProfile(data: {
  name: string;
  title: string;
  department: string;
  bio: string;
}) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error("Not authenticated");
  }

  await connectDB();
  
  await User.findOneAndUpdate(
    { email: session.user.email },
    {
      $set: {
        name: data.name,
        title: data.title,
        department: data.department,
        bio: data.bio,
      },
    }
  );

  revalidatePath("/settings");
  revalidatePath("/profile");
  
  return { success: true };
}
