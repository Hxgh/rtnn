import { NextRequest, NextResponse } from "next/server";
import { checkClientUpdate } from "@/lib/server/api-client";

function readQuery(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const client = params.get("client")?.trim();
  const target = params.get("target")?.trim();
  const channel = params.get("channel")?.trim();
  const currentVersion = params.get("currentVersion")?.trim();

  return {
    client,
    target,
    ...(channel ? { channel } : {}),
    ...(currentVersion ? { currentVersion } : {}),
  };
}

export async function GET(request: NextRequest) {
  const query = readQuery(request);

  if (!query.client || !query.target) {
    return NextResponse.json(
      { message: "client and target are required" },
      { status: 400 },
    );
  }

  const result = await checkClientUpdate({
    client: query.client,
    target: query.target,
    channel: query.channel,
    currentVersion: query.currentVersion,
  });

  return NextResponse.json(result);
}
