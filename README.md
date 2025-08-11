# WhatsDown

A WhatsApp Web lookalike application built with Next.js that receives messages and status updates via webhooks and displays them in a familiar chat interface.

## 🚀 Features

- **Real-time messaging**: Receive messages via webhook endpoints
- **WhatsApp-like UI**: Familiar chat interface with conversation list and message display
- **Conversation segregation**: Automatically organizes messages by conversation/contact
- **Status updates**: Handles both message and status payloads
- **Responsive design**: Works across desktop and mobile devices


## 🛠 Tech Stack

- **Frontend**: Next.js (React framework)
- **Database**: MongoDB with Prisma ORM
- **Styling**:Tailwind CSS 
- **API**: RESTful endpoints for webhook handling

## 📁 Database Schema

### Conversation
Represents individual contacts or chat participants
```prisma
model Conversation {
  id              String    @id @default(auto()) @map("_id") @db.ObjectId
  name            String
  wa_id           String
  conversation_id String    @unique
  messages        Message[]
  last_message_at DateTime
  created_at      DateTime
}
```

### Message
Stores all text messages within conversations
```prisma
model Message {
  id              String       @id @default(auto()) @map("_id") @db.ObjectId
  message_id      String       @unique
  conversation    Conversation @relation(fields: [conversation_id], references: [conversation_id])
  conversation_id String
  direction       String 
  type            String 
  status          String       @default("recieved") 
  text_body       String?
  timestamp       DateTime
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt
  sender_wa_id    String

  @@index([conversation_id])
  @@index([timestamp])
}
```

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Aman-web-dev/Whatsdown.git
   cd whatsdown
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="mongodb://localhost:27017/whatsdown"
   # or your MongoDB connection string
   MONGODB_URI="your_mongodb_connection_string"
   ```

4. **Set up Prisma**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - Frontend: `http://localhost:3000/`
   - Webhook endpoint: `http://localhost:3000/webhook`

## 📡 API Endpoints

### Webhook Endpoint
**POST** `/webhook`

Receives message and status payloads and stores them in the database.

#### Request Body Examples

**Message Payload:**
```json
{
  "payload_type": "whatsapp_webhook",
  "_id": "conv1-msg1-user",
  "metaData": {
    "entry": [
      {
        "changes": [
          {
            "field": "messages",
            "value": {
              "contacts": [
                {
                  "profile": {
                    "name": "Ravi Kumar"
                  },
                  "wa_id": "919937320320"
                }
              ],
              "messages": [
                {
                  "from": "919937320320",
                  "id": "wamid.HBgMOTE5OTY3NTc4NzIwFQIAEhggMTIzQURFRjEyMzQ1Njc4OTA=",
                  "timestamp": "1754400000",
                  "text": {
                    "body": "Hi, I’d like to know more about your services."
                  },
                  "type": "text"
                }
              ],
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "918329446654",
                "phone_number_id": "629305560276479"
              }
            }
          }
        ],
        "id": "30164062719905277"
      }
    ],
    "gs_app_id": "conv1-app",
    "object": "whatsapp_business_account"
  },
  "createdAt": "2025-08-06 12:00:00",
  "startedAt": "2025-08-06 12:00:00",
  "completedAt": "2025-08-06 12:00:01",
  "executed": true
}

```

**Status Payload:**
```json
{
  "payload_type": "whatsapp_webhook",
  "_id": "conv1-msg2-status",
  "metaData": {
    "entry": [
      {
        "changes": [
          {
            "field": "messages",
            "value": {
              "messaging_product": "whatsapp",
              "metadata": {
                "display_phone_number": "918329446654",
                "phone_number_id": "629305560276479"
              },
              "statuses": [
                {
                  "conversation": {
                    "id": "conv1-convo-id",
                    "origin": {
                      "type": "user_initiated"
                    }
                  },
                  "gs_id": "conv1-msg2-gs-id",
                  "id": "wamid.HBgMOTE5OTY3NTc4NzIwFQIAEhggNDc4NzZBQ0YxMjdCQ0VFOTk2NzA3MTI4RkZCNjYyMjc=",
                  "meta_msg_id": "wamid.HBgMOTE5OTY3NTc4NzIwFQIAEhggNDc4NzZBQ0YxMjdCQ0VFOTk2NzA3MTI4RkZCNjYyMjc=",
                  "recipient_id": "919937320320",
                  "status": "read",
                  "timestamp": "1754400040"
                }
              ]
            }
          }
        ],
        "id": "30164062719905278"
      }
    ],
    "gs_app_id": "conv1-app",
    "object": "whatsapp_business_account",
    "startedAt": "2025-08-06 12:00:40",
    "completedAt": "2025-08-06 12:00:40",
    "executed": true
  }
}

```

#### Response
```json
{
  "success": true,
  "message": "Payload processed successfully"
}
```

## 🏗 Project Structure

```
whatsdown/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   └── webhook.js
│   │   └── index.js
│   ├── components/
│   │   ├── ChatInterface.js
│   │   ├── ConversationList.js
│   │   └── MessageDisplay.js
│   ├── lib/
│   │   └── prisma.js
│   └── styles/
├── public/
├── package.json
├── next.config.js
└── README.md
└── tsconfig.json
└── postcss.config.mjs
```

## 💻 Usage

1. **Start the application**: The frontend will be available at `http://localhost:3000/`

2. **Send webhook data**: POST requests to `http://localhost:3000/webhook` with message or status payloads

3. **View messages**: The frontend automatically displays new conversations and messages as they're received

