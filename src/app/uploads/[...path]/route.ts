import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } },
) {
  const target = new URL(`/api/uploads/${(params.path || []).join("/")}`, req.url);
  return NextResponse.redirect(target, 301);
}