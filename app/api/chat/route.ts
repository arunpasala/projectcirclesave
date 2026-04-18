import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createResponseWithRetry(message: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: [
              {
                type: "input_text",
                text: `
You are CircleSave Assistant.

Help users with:
- circles
- join requests
- contributions
- payouts
- cycles
- notifications

Rules:
- Keep answers short and clear
- Be friendly
- If the user asks about CircleSave features, explain them simply
                `.trim(),
              },
            ],
          },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: message,
              },
            ],
          },
        ],
      });

      return response;
    } catch (err: any) {
      if (err?.status === 429 && attempt < 3) {
        await sleep(1500 * attempt);
        continue;
      }
      throw err;
    }
  }

  throw new Error("Failed to get response from OpenAI.");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("CHAT BODY:", body);

    const message = body?.message;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const response = await createResponseWithRetry(message);

    return NextResponse.json({
      reply: response.output_text || "No response generated.",
    });
  } catch (error: any) {
    console.error("Chat API error:", error);

    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: error?.status || 500 }
    );
  }
}