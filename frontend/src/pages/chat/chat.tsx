import { ChatInput } from "@/components/custom/chatinput";
import {
  PreviewMessage,
  ThinkingMessage,
} from "../../components/custom/message";
import { useScrollToBottom } from "@/components/custom/use-scroll-to-bottom";
import { useState, useEffect } from "react";
import { message } from "../../interfaces/interfaces";
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import { Sidebar } from "@/components/custom/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { sendChatMessage } from "@/services/api";

interface Chat {
  id: string;
  name: string;
  messages: message[];
}

export function Chat() {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();
  const [chats, setChats] = useState<Chat[]>([]); // Chats with messages (history)
  const [tempChat, setTempChat] = useState<Chat | null>(null); // Current new chat (if any)
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<message[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNewChat, setIsNewChat] = useState<boolean>(true);

  // Create a new temp chat when the component mounts if there are no chats
  useEffect(() => {
    if (chats.length === 0 && !tempChat) {
      createNewChat();
    }
  }, []);

  // Update messages when active chat changes
  useEffect(() => {
    if (!activeChat) return;

    // Check if active chat is the temp chat
    if (tempChat && tempChat.id === activeChat) {
      setMessages(tempChat.messages);
      setIsNewChat(true);
      return;
    }

    // Otherwise, find the chat in history
    const chat = chats.find((chat) => chat.id === activeChat);
    if (chat) {
      setMessages(chat.messages);
      setIsNewChat(false);
    }
  }, [activeChat, chats, tempChat]);

  // Create a new chat
  const createNewChat = () => {
    const newChatId = uuidv4();
    const newChat = {
      id: newChatId,
      name: `New Chat`,
      messages: [],
    };

    // Set the new chat as the temp chat
    setTempChat(newChat);
    setActiveChat(newChatId);
    setMessages([]);
    setIsNewChat(true);
  };

  // Delete a chat
  const handleDeleteChat = (chatId: string) => {
    // Check if we're deleting the active chat
    if (activeChat === chatId) {
      // If we're deleting the temp chat, create a new one
      if (tempChat && tempChat.id === chatId) {
        createNewChat();
        return;
      }

      // Otherwise, we're deleting a chat from history
      const remainingChats = chats.filter((chat) => chat.id !== chatId);

      if (remainingChats.length > 0) {
        // If there are other chats, activate the first one
        const nextChat = remainingChats[0];
        setChats(remainingChats);
        setActiveChat(nextChat.id);
        setMessages(nextChat.messages);
        setIsNewChat(false);
      } else {
        // If this was the last chat, create a new temp chat
        setChats(remainingChats);
        createNewChat();
      }
    } else {
      // If we're not deleting the active chat, just update the chats list
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));
    }
  };

  // Select a chat
  const selectChat = (chatId: string) => {
    setActiveChat(chatId);

    // Check if selected chat is the temp chat
    if (tempChat && tempChat.id === chatId) {
      setMessages(tempChat.messages);
      setIsNewChat(true);
      return;
    }

    // Otherwise, find the chat in history
    const chat = chats.find((chat) => chat.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setIsNewChat(false);
    }
  };

  // Handle message submission
  async function handleSubmit(text?: string) {
    if (isLoading) return;

    const messageText = text || question;
    if (!messageText.trim()) return;

    // Ensure we have an active chat before proceeding
    if (!activeChat) {
      createNewChat();
      return;
    }

    setIsLoading(true);
    const messageId = uuidv4();

    // Create user message
    const userMessage = {
      content: messageText,
      role: "user",
      id: messageId,
    };

    // Add user message to messages
    setMessages((prev) => [...prev, userMessage]);

    // Update chats based on whether we're using a temp chat or a history chat
    if (tempChat && tempChat.id === activeChat) {
      // We're using the temp chat, which will now become part of history
      const updatedChat = {
        ...tempChat,
        messages: [...tempChat.messages, userMessage],
        name:
          messageText.length > 30
            ? `${messageText.substring(0, 30)}...`
            : messageText,
      };

      // Add it to history and clear temp chat
      setChats((prevChats) => [updatedChat, ...prevChats]);
      setTempChat(null);
      setActiveChat(updatedChat.id);
    } else {
      // We're updating an existing chat in history
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChat
            ? { ...chat, messages: [...chat.messages, userMessage] }
            : chat
        )
      );
    }

    setQuestion("");
    setIsNewChat(false);

    try {
      // Send message to backend API
      const response = await sendChatMessage(messageText);

      if (response.response) {
        // Add assistant response to messages
        const assistantMessage = response.response;
        setMessages((prev) => [...prev, assistantMessage]);

        // Update the active chat with the assistant response
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChat
              ? { ...chat, messages: [...chat.messages, assistantMessage] }
              : chat
          )
        );
      } else if (response.error) {
        console.error("API error:", response.error);
        // Add error message
        const errorMessage = {
          content: "Sorry, there was an error processing your request.",
          role: "assistant",
          id: uuidv4(),
        };

        setMessages((prev) => [...prev, errorMessage]);
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChat
              ? { ...chat, messages: [...chat.messages, errorMessage] }
              : chat
          )
        );
      }
    } catch (error) {
      console.error("API request failed:", error);
      // Add error message
      const errorMessage = {
        content: "Sorry, there was an error connecting to the service.",
        role: "assistant",
        id: uuidv4(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === activeChat
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Get all chats for display in sidebar (only show chats with messages)
  const getDisplayChats = () => {
    return chats;
  };

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <Header>
        <Button
          variant="ghost"
          size="icon"
          className="mr-2"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </Header>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onDeleteChat={handleDeleteChat}
        chats={getDisplayChats()}
        activeChat={activeChat}
        onSelectChat={selectChat}
        onNewChat={createNewChat}
      />

      <div
        className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4"
        ref={messagesContainerRef}
      >
        {messages.length == 0 && <Overview />}
        {messages.map((message, index) => (
          <PreviewMessage key={index} message={message} />
        ))}
        {isLoading && <ThinkingMessage />}
        <div
          ref={messagesEndRef}
          className="shrink-0 min-w-[24px] min-h-[24px]"
        />
      </div>
      <div className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <ChatInput
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          isNewChat={isNewChat}
        />
      </div>
    </div>
  );
}
