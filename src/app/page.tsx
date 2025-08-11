import { unstable_noStore as noStore } from 'next/cache';
import prisma from "@/lib/prisma";
import WhatsAppInterface from './Components/WhatsappInterface';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

const whatsappWeb = async () => {
  noStore(); // Disable all caching
  


  console.log('Fresh data loaded at:', new Date().toISOString());
  
  return <WhatsAppInterface />;
};

export default whatsappWeb;