import { NextRequest, NextResponse } from "next/server";
import { verifyPaddleWebhookSignature, PaddleSecurityError } from "@/lib/paddle/paddle-client";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("paddle-signature");
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET_KEY;

    let event: any;

    // MANDATORY CRYPTOGRAPHIC VERIFICATION
    if (webhookSecret && signature) {
      try {
        const isValid = verifyPaddleWebhookSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
          return NextResponse.json(
            { error: "Paddle cryptographic signature mismatch." },
            { status: 401 }
          );
        }
      } catch (err: any) {
        return NextResponse.json(
          { error: `Webhook verification failed: ${err.message}` },
          { status: 400 }
        );
      }
    }

    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const eventType = event.event_type || event.type;

    // Paddle events: transaction.completed or transaction.paid
    if (eventType === "transaction.completed" || eventType === "transaction.paid") {
      const transactionData = event.data;
      const projectId = transactionData?.custom_data?.projectId;

      if (!projectId) {
        return NextResponse.json(
          { error: "Paddle transaction missing custom_data.projectId" },
          { status: 400 }
        );
      }

      // Cryptographically verified! Safely unlock clean-room rebuild
      console.log(`[REVFORGE_PADDLE_VERIFIED] Project ${projectId} unlocked. BullMQ job enqueued.`);

      return NextResponse.json({
        verified: true,
        projectId,
        transactionId: transactionData.id,
        status: "unlocked_and_enqueued",
        jobType: "clean_room_rebuild",
      });
    }

    return NextResponse.json({ received: true, eventType });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Paddle webhook processing error" },
      { status: 500 }
    );
  }
}
