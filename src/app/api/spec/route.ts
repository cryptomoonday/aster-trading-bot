import { NextResponse } from "next/server";
import { moonSpec, defaultWatermellonConfig } from "@/lib/spec";

export function GET() {
  return NextResponse.json({
    ...moonSpec,
    defaultConfig: defaultWatermellonConfig,
    timestamp: new Date().toISOString(),
  });
}

