import { NextResponse } from 'next/server';

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  return NextResponse.json({ configured });
}
