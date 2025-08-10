
import prisma from "@/lib/prisma";
import WhatsAppInterface from "./Components/WhatsappInterface";
import { sendMessage } from "./action";


const whatsappWeb = async () => {
  const conversations = await prisma.conversation.findMany({
    include: {
      messages: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  

  // Group messages into sent/received for each conversation
  const conversationArray = conversations.map((convo) => {
    const sent = convo.messages.filter((m) => m.direction === "outbound");
    const received = convo.messages.filter((m) => m.direction === "inbound");
    return {
      ...convo,
      sent,
      received,
    };
  });




  return <WhatsAppInterface ConversationArray={conversationArray}/>;
};

export default whatsappWeb;
