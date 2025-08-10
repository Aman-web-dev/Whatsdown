"use server";

import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

type Profile = {
  name: string;
};

type Contact = {
  profile: Profile;
  wa_id: string;
};

export const sendMessage = async (contact: Contact, messageText: string) => {
  try {
    // First check if conversation exists
    const existingConversation = await prisma.conversation.findUnique({
      where: { conversation_id: contact.wa_id }
    });

    if (!existingConversation) {
      throw new Error(`No existing conversation found for WA ID: ${contact.wa_id}`);
    }

    const waMsgId = uuidv4();
    const timestamp = new Date();

    await prisma.message.create({
      data: {
        conversation: {
          connect: { conversation_id: contact.wa_id }
        },
        message_id: waMsgId,
        type: "text",
        text_body: messageText,
        timestamp,
        direction: "outbound",
        status: "sent",
        sender_wa_id: "918329446654", // Your business number
      },
    });

    // Update conversation's last message timestamp
    await prisma.conversation.update({
      where: { conversation_id: contact.wa_id },
      data: {
        last_message_at: timestamp,
      },
    });

    return { success: true, waMsgId };
  } catch (error) {
    console.error("Error sending message:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send message" 
    };
  }
};