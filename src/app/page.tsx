import { unstable_noStore as noStore } from 'next/cache';
import prisma from "@/lib/prisma";
import WhatsAppInterface from './Components/WhatsappInterface';


const whatsappWeb = async () => {
  return <WhatsAppInterface />;
};

export default whatsappWeb;