"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  Search,
  MoreVertical,
  Phone,
  Video,
  Send,
  Paperclip,
  Mic,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { sendMessage } from "../action";
import { getMessages } from "../action";

const WhatsAppInterface = () => {
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [conversationArray, setConversationArray] = useState<any>([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getMessagesFromDbAndSet = async (showLoading = true) => {
    try {
      if (showLoading && conversationArray.length === 0) {
        setInitialLoading(true);
      } else if (showLoading) {
        setRefreshing(true);
      }
      
      const convo = await getMessages();
      setConversationArray(convo || []);
      
      // Update selected chat if it exists
      if (selectedChat && convo) {
        const updatedSelectedChat = convo.find(
          (conv: any) => conv.id === selectedChat.id
        );
        if (updatedSelectedChat) {
          // Transform the updated conversation to match our format
          const transformedUpdated = transformSingleConversation(updatedSelectedChat);
          setSelectedChat(transformedUpdated);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  // Transform a single conversation
  const transformSingleConversation = (conversation: any) => {
    const customerMessage = conversation.messages?.find(
      (msg: any) => msg.direction === "inbound"
    );
    const customerPhone = customerMessage?.wa_id || conversation.conversation_id;
    const customerName = conversation.name;

    const sortedMessages = conversation.messages?.sort(
      (a: any, b: any) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ) || [];

    const lastMessage = sortedMessages[sortedMessages.length - 1];
    const lastMessageText = lastMessage?.text_body || "No messages";

    const formatTime = (timestamp: string) => {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (diffDays === 2) {
        return "Yesterday";
      } else if (diffDays > 2) {
        return date.toLocaleDateString();
      }
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const lastMessageTime = lastMessage ? formatTime(lastMessage.timestamp) : "";

    const unreadCount = conversation.received?.filter((msg: any) => {
      const msgTime = new Date(msg.timestamp).getTime();
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      return msgTime > oneHourAgo;
    }).length || 0;

    const transformedMessages = sortedMessages.map((msg: any) => ({
      id: msg.id,
      text: msg.text_body,
      sent: msg.direction === "outbound",
      time: formatTime(msg.timestamp),
      status: msg.status,
    }));

    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${customerName}&backgroundColor=25D366&textColor=ffffff`;

    return {
      id: conversation.id,
      conversation_id: conversation.conversation_id,
      name: customerName,
      phone: customerPhone,
      avatar: avatar,
      lastMessage: lastMessageText,
      time: lastMessageTime,
      unread: unreadCount,
      messages: transformedMessages,
      rawData: conversation,
    };
  };

  // Initial load and setup polling
  React.useEffect(() => {
    getMessagesFromDbAndSet();

    // Set up polling for new messages every 5 seconds
    intervalRef.current = setInterval(() => {
      getMessagesFromDbAndSet(false);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle window resize
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  console.log("Conversation Array", conversationArray);

  // Transform API data to chat format with memoization
  const transformedChats = useMemo(() => {
    if (!conversationArray || !Array.isArray(conversationArray)) return [];

    return conversationArray
      .map(transformSingleConversation)
      .sort((a, b) => {
        // Sort by last message time, most recent first
        const timeA = new Date(a.rawData.last_message_at || 0).getTime();
        const timeB = new Date(b.rawData.last_message_at || 0).getTime();
        return timeB - timeA;
      });
  }, [conversationArray]);

  const handleSendMessage = async () => {
    if (message.trim() && selectedChat && !sendingMessage) {
      setSendingMessage(true);
      
      try {
        console.log("Sending message:", message, "to:", selectedChat.phone);

        // Optimistically add message to UI
        const newMessage = {
          id: `temp-${Date.now()}`,
          text: message,
          sent: true,
          time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "sending",
        };

        // Update UI immediately
        setSelectedChat((prev: any) => ({
          ...prev,
          messages: [...prev.messages, newMessage],
          lastMessage: message,
          time: newMessage.time,
        }));

        const contact = {
          wa_id: selectedChat.conversation_id,
          profile: { name: selectedChat.name },
        };

        const messageSent = await sendMessage(contact, message);

        if (messageSent.success === true) {
          // Update the message status to sent
          setSelectedChat((prev: any) => ({
            ...prev,
            messages: prev.messages.map((msg: any) =>
              msg.id === newMessage.id ? { ...msg, status: "sent" } : msg
            ),
          }));

          // Refresh conversations to get the latest data
          setTimeout(() => {
            getMessagesFromDbAndSet(false);
          }, 1000);
        } else {
          // Remove failed message or mark as failed
          setSelectedChat((prev: any) => ({
            ...prev,
            messages: prev.messages.map((msg: any) =>
              msg.id === newMessage.id ? { ...msg, status: "failed" } : msg
            ),
          }));
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // Handle error - could show toast notification
      } finally {
        setSendingMessage(false);
        setMessage("");
      }
    }
  };

  const handleChatSelect = (chat: any) => {
    setSelectedChat(chat);
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  const handleRefresh = () => {
    getMessagesFromDbAndSet(true);
  };

  // Loading screen
  if (initialLoading) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-700 mb-2">
            Loading Conversations...
          </h2>
          <p className="text-gray-500">Please wait while we fetch your messages</p>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!conversationArray || conversationArray.length === 0) {
    return (
      <div className="flex h-screen bg-gray-100 items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📱</div>
          <h2 className="text-xl font-medium text-gray-700 mb-2">
            No Conversations
          </h2>
          <p className="text-gray-500 mb-4">Start a conversation to see it here</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Chat List Sidebar */}
      <div
        className={`${
          isMobile ? (selectedChat ? "hidden" : "flex") : "flex"
        } flex-col w-full md:w-96 bg-white border-r border-gray-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
            WA
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className={`p-2 text-gray-600 hover:bg-gray-200 rounded-full ${
                refreshing ? "animate-spin" : ""
              }`}
              disabled={refreshing}
            >
              <RefreshCw size={20} />
            </button>
            <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Refresh indicator */}
        {refreshing && (
          <div className="px-3 py-2 bg-green-50 border-b border-green-100">
            <div className="flex items-center text-green-600 text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Refreshing conversations...
            </div>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {transformedChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => handleChatSelect(chat)}
              className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${
                selectedChat?.id === chat.id ? "bg-gray-100" : ""
              }`}
            >
              <img
                src={chat.avatar}
                alt={chat.name}
                className="w-12 h-12 rounded-full mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="w-12 h-12 rounded-full mr-3 bg-green-500 text-white flex items-center justify-center font-bold text-sm hidden"
                style={{ marginLeft: "-60px" }}
              >
                {chat.name.slice(-2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {chat.name}
                  </h3>
                  <span className="text-xs text-gray-500">{chat.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 truncate">
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className={`${
          isMobile ? (selectedChat ? "flex" : "hidden") : "flex"
        } flex-col flex-1`}
      >
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center p-3 bg-gray-50 border-b border-gray-200">
              {isMobile && (
                <button
                  onClick={handleBack}
                  className="p-2 mr-2 text-gray-600 hover:bg-gray-200 rounded-full"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <img
                src={selectedChat.avatar}
                alt={selectedChat.name}
                className="w-10 h-10 rounded-full mr-3"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div
                className="w-10 h-10 rounded-full mr-3 bg-green-500 text-white flex items-center justify-center font-bold text-sm hidden"
                style={{ marginLeft: "-52px" }}
              >
                {selectedChat.name.slice(-2)}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {selectedChat.name}
                </h3>
                <p className="text-sm text-gray-500">{selectedChat.phone}</p>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full">
                  <Video size={20} />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full">
                  <Phone size={20} />
                </button>
                <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto p-4 bg-gray-50"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f0f0f0" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              }}
            >
              <div className="max-w-4xl mx-auto">
                {selectedChat.messages && selectedChat.messages.length > 0 ? (
                  selectedChat.messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex mb-4 ${
                        msg.sent ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          msg.sent
                            ? "bg-green-500 text-white rounded-br-none"
                            : "bg-white text-gray-900 rounded-bl-none shadow-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">
                          {msg.text}
                        </p>
                        <div
                          className={`flex items-center justify-between mt-1 ${
                            msg.sent ? "text-green-100" : "text-gray-500"
                          }`}
                        >
                          <span className="text-xs">{msg.time}</span>
                          {msg.sent && (
                            <span className="text-xs ml-2">
                              {msg.status === "sent" && "✓"}
                              {msg.status === "delivered" && "✓✓"}
                              {msg.status === "read" && (
                                <span className="text-blue-300">✓✓</span>
                              )}
                              {msg.status === "sending" && "⏳"}
                              {msg.status === "failed" && "❌"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 mt-8">
                    <p>No messages in this conversation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-3 bg-white border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                  <Paperclip size={20} />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={sendingMessage}
                  />
                </div>
                {message.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50"
                    disabled={sendingMessage}
                  >
                    {sendingMessage ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                ) : (
                  <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          // Welcome Screen
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-80 h-80 mx-auto mb-8 bg-gray-200 rounded-full flex items-center justify-center">
                <div className="text-6xl text-gray-400">💬</div>
              </div>
              <h2 className="text-3xl font-light text-gray-700 mb-2">
                WhatsDown Web
              </h2>
              <p className="text-gray-500 max-w-md mx-auto leading-relaxed">
                Send and receive messages without keeping your phone online. Use
                WhatsDown on up to 4 linked devices and 1 phone at the same
                time.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppInterface;