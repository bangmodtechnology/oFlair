import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-static";

export async function GET() {
  try {
    const items = await prisma.conversionHistory.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return NextResponse.json(
      items.map((item) => ({
        ...item,
        jobsConverted: JSON.parse(item.jobsConverted),
      }))
    );
  } catch (error) {
    console.error("Failed to get history:", error);
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const item = await prisma.conversionHistory.create({
      data: {
        sourceFile: body.sourceFile,
        sourceType: body.sourceType,
        jobsConverted: JSON.stringify(body.jobsConverted),
        airflowVersion: body.airflowVersion,
        status: body.status,
      },
    });
    return NextResponse.json({
      ...item,
      jobsConverted: JSON.parse(item.jobsConverted),
    });
  } catch (error) {
    console.error("Failed to add history item:", error);
    return NextResponse.json(
      { error: "Failed to add history item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      await prisma.conversionHistory.delete({ where: { id } });
    } else {
      await prisma.conversionHistory.deleteMany();
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete history:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
