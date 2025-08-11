import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (!payload.payload_type || payload.payload_type !== "whatsapp_webhook") {
      return NextResponse.json(
        { error: "Invalid payload type" },
        { status: 400 }
      );
    }

    if (
      payload.metaData?.entry?.[0]?.changes?.[0]?.field === "messages" &&
      payload.metaData?.entry?.[0]?.changes?.[0]?.value.statuses
    ) {
      await processStatusPayload(payload);
    } else if (
      payload.metaData?.entry?.[0]?.changes?.[0]?.field === "messages"
    ) {
      await processMessagePayload(payload);
    }

    return NextResponse.json({
      success: true,
      message: "Payload processed successfully",
    });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function processMessagePayload(payload: any) {
  const entry = payload.metaData.entry[0];
  const change = entry.changes[0];
  const value = change.value;

  const conversationData = {
    conversation_id: value.contacts[0].wa_id,
    wa_id: value.contacts[0].wa_id,
    name: value.contacts[0].profile.name,
    last_message_at: new Date(parseInt(value.messages[0].timestamp) * 1000),
    created_at: new Date(),
  };

  const message = value.messages[0];
  const messageData = {
    message_id: message.id,
    conversation_id: value.contacts[0].wa_id,
    direction:
      value.metadata.display_phone_number === message.from
        ? "outbound"
        : "inbound",
    type: message.type,
    status: "received",
    text_body: message.text?.body,
    timestamp: new Date(parseInt(message.timestamp) * 1000),
    sender_wa_id: message.from,
  };

  await prisma.$transaction(async (tx: any) => {
    await tx.conversation.upsert({
      where: { conversation_id: conversationData.conversation_id },
      update: {
        last_message_at: conversationData.last_message_at,
      },
      create: conversationData,
    });

    await tx.message.create({
      data: messageData,
    });
  });
}

async function processStatusPayload(payload: any) {
  const entry = payload.metaData.entry[0];
  const change = entry.changes[0];
  const statusData = change.value.statuses[0];

  await prisma.message.update({
    where: {
      message_id: statusData.id || statusData.meta_msg_id,
    },
    data: {
      status: statusData.status,
    },
  });
}
