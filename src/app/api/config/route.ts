import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { DEFAULT_CONFIG, type AppConfig } from "@/lib/storage/config-storage";

export const dynamic = "force-static";

const CONFIG_KEY = "app_config";

export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: CONFIG_KEY },
    });
    if (!setting) {
      return NextResponse.json(DEFAULT_CONFIG);
    }
    const config = { ...DEFAULT_CONFIG, ...JSON.parse(setting.value) };
    return NextResponse.json(config);
  } catch (error) {
    console.error("Failed to get config:", error);
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: Request) {
  try {
    const config: AppConfig = await request.json();
    await prisma.setting.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(config) },
      create: { key: CONFIG_KEY, value: JSON.stringify(config) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save config:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.setting.deleteMany({ where: { key: CONFIG_KEY } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete config:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
