import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0 });
}
