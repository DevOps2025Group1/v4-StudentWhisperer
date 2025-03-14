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
import { Menu, PlusCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { sendChatMessage } from "@/services/api";
import { toast } from "sonner";
import { useTokenUsage } from "@/context/TokenUsageContext";

interface Chat {
  id: string;
  name: string;
  messages: message[];
}

export function Chat() {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [tempChat, setTempChat] = useState<Chat | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<message[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isNewChat, setIsNewChat] = useState<boolean>(true);
  const [tokenLimitReached, setTokenLimitReached] = useState<boolean>(false);
  const { tokenUsage, refreshTokenUsage } = useTokenUsage();

  // Check token limit when component mounts or tokenUsage changes
  useEffect(() => {
    if (tokenUsage && tokenUsage.percentage_used >= 100) {
      setTokenLimitReached(true);

      // Add system message about token limit if no messages yet
      if (messages.length === 0) {
        const limitMessage = {
          content:
            "You've reached your monthly token limit. Please contact an administrator for assistance.",
          role: "assistant",
          id: uuidv4(),
          isError: true,
        };
        setMessages([limitMessage]);

        // If we have a temp chat, add the message to it
        if (tempChat) {
          setTempChat({
            ...tempChat,
            messages: [limitMessage],
          });
        }
      }
    }
  }, [tokenUsage, messages.length, tempChat]);

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
    if (tempChat && tempChat.id === chatId) {
      // If deleting the temp chat, create a new one
      setTempChat(null);
      setActiveChat(null);
      createNewChat();
      return;
    }

    // Delete from chat history
    setChats((prev) => prev.filter((chat) => chat.id !== chatId));

    // If deleting the active chat, select a new one
    if (activeChat === chatId) {
      createNewChat();
    }
  };

  // Select a chat
  const selectChat = (chatId: string) => {
    setActiveChat(chatId);
  };

  // Get combined chats for UI display
  const getDisplayChats = (): Chat[] => {
    if (tempChat) {
      return [tempChat, ...chats];
    }
    return chats;
  };

  // Handle message submission
  async function handleSubmit(text?: string) {
    if (isLoading) return;

    // If token limit is reached, show error and prevent submission
    if (tokenLimitReached) {
      toast.error(
        "Monthly token limit reached. Please contact an administrator for assistance."
      );
      return;
    }

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

    try {
      // Refresh token usage before sending the message
      await refreshTokenUsage();

      // Send message to backend API
      const response = await sendChatMessage(messageText);

      // Refresh token usage after we get a response - this updates the progress bar
      await refreshTokenUsage();

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
      } else if (
        response.error === "token_limit_reached" ||
        response.tokenLimitReached
      ) {
        // Handle token limit reached error
        setTokenLimitReached(true);

        // Refresh token usage to update UI
        await refreshTokenUsage();

        // Add assistant error message about token limit
        const errorMessage = {
          content:
            response.message ||
            "You've reached your monthly token limit. Please contact an administrator for assistance.",
          role: "assistant",
          id: uuidv4(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
        setChats((prevChats) =>
          prevChats.map((chat) =>
            chat.id === activeChat
              ? { ...chat, messages: [...chat.messages, errorMessage] }
              : chat
          )
        );
        toast.error("Monthly token limit reached");
      } else if (response.error) {
        console.error("API error:", response.error);

        // Refresh token usage
        await refreshTokenUsage();

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
      console.error("Error in handleSubmit:", error);

      // Make sure to refresh token usage even if there was an error
      await refreshTokenUsage();
      toast.error("An error occurred while processing your message");
    } finally {
      setIsLoading(false);
      setQuestion("");
    }
  }

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <Header showTitle={false}>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="size-9 rounded-full"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            onClick={createNewChat}
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
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
        {messages.length == 0 && !tokenLimitReached && <Overview />}
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
          disabled={tokenLimitReached}
        />
      </div>
    </div>
  );
}
