import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function fallbackReply(message: string) {
  const msg = message.toLowerCase();

  if (msg.includes("join")) {
    return "Go to the circles section and click Request Join. The owner must approve your request.";
  } else if (msg.includes("notification")) {
    return "Check the notifications section on your dashboard for updates.";
  } else if (msg.includes("request")) {
    return "Owners can approve or reject pending join requests from their dashboard.";
  } else if (msg.includes("schedule")) {
    return "Only the circle owner should generate the payout schedule.";
  } else if (msg.includes("cycle")) {
    return "A cycle can move forward only after the current one is completed correctly.";
  } else if (msg.includes("dashboard")) {
    return "This dashboard helps you view circles, requests, and notifications.";
  }

  return "I can help with CircleSave features like circles, requests, notifications, schedules, and cycle rules.";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = String(body?.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    try {
      const response = await client.responses.create({
        model: "gpt-4.1-mini",
        temperature: 0.3,
        input: [
          {
            role: "system",
            content: `
You are CircleSave Assistant.
You help users understand circles, requests, payouts, notifications, dashboard usage, and cycle rules.
Do not claim to perform actions.
Do not bypass permissions.
Keep answers short and clear.
            `,
          },
          {
            role: "user",
            content: message,
          },
        ],
      });

      return NextResponse.json({
        reply: response.output_text || fallbackReply(message),
        source: "llm",
      });
    } catch (error: any) {
      console.error("OpenAI error:", error);

      return NextResponse.json({
        reply: fallbackReply(message),
        source: "fallback",
        warning: "LLM quota unavailable, using fallback response.",
      });
    }
  } catch (error) {
    console.error("Chat route error:", error);

    return NextResponse.json(
      { error: "Failed to process chat request." },
      { status: 500 }
    );
  }
}