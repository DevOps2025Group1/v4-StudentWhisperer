import { ChatInput } from "@/components/custom/chatinput";
import { PreviewMessage, ThinkingMessage } from "../../components/custom/message";
import { useScrollToBottom } from '@/components/custom/use-scroll-to-bottom';
import { useState, useEffect } from "react";
import { message } from "../../interfaces/interfaces"
import { Overview } from "@/components/custom/overview";
import { Header } from "@/components/custom/header";
import { Sidebar } from "@/components/custom/sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {v4 as uuidv4} from 'uuid';
import { sendChatMessage } from "@/services/api";

interface Chat {
  id: string;
  name: string;
  messages: message[];
}

export function Chat() {
  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<message[]>([]);
  const [question, setQuestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Create a new chat when the component mounts if there are no chats
  useEffect(() => {
    if (chats.length === 0) {
      createNewChat();
    }
  }, []);

  // Update messages when active chat changes
  useEffect(() => {
    if (activeChat) {
      const chat = chats.find(chat => chat.id === activeChat);
      if (chat) {
        setMessages(chat.messages);
      }
    }
  }, [activeChat, chats]);

  // Create a new chat
  const createNewChat = () => {
    const newChatId = uuidv4();
    const newChat = {
      id: newChatId,
      name: `Chat ${chats.length + 1}`,
      messages: []
    };
    setChats([...chats, newChat]);
    setActiveChat(newChatId);
    setMessages([]);
  };

  // Delete a chat
  const handleDeleteChat = (chatId: string) => {
    // Remove the chat first
    const remainingChats = chats.filter(chat => chat.id !== chatId);
    
    // Check if we're deleting the active chat
    if (activeChat === chatId) {
      if (remainingChats.length > 0) {
        // If there are other chats, activate the first one
        const nextChat = remainingChats[0];
        // Update state in sequence
        setChats(remainingChats);
        setActiveChat(nextChat.id);
        setMessages(nextChat.messages);
      } else {
        // If this was the last chat, create a new one
        const newChatId = uuidv4();
        const newChat = {
          id: newChatId,
          name: "Chat 1",
          messages: []
        };
        // Set the new chat as the only chat
        setChats([newChat]);
        setActiveChat(newChatId);
        setMessages([]);
      }
    } else {
      // If we're not deleting the active chat, just update the chats list
      setChats(remainingChats);
    }
  };

  // Select a chat
  const selectChat = (chatId: string) => {
    setActiveChat(chatId);
    const chat = chats.find(chat => chat.id === chatId);
    if (chat) {
      setMessages(chat.messages);
    }
  };

  // Remove the unused updateChatName function

async function handleSubmit(text?: string) {
  if (isLoading) return;
  
  const messageText = text || question;
  if (!messageText.trim()) return;
  
  // Ensure we have an active chat before proceeding
  if (!activeChat) {
    createNewChat();
  }
  
  setIsLoading(true);
  const messageId = uuidv4();
  
  // Create user message
  const userMessage = { 
    content: messageText, 
    role: "user", 
    id: messageId 
  };
  
  // Add user message to messages
  setMessages(prev => [...prev, userMessage]);
  
  // Update the active chat with the new message
  setChats(prevChats => 
    prevChats.map(chat => 
      chat.id === activeChat 
        ? { 
            ...chat, 
            messages: [...chat.messages, userMessage],
            // If this is the first user message, update chat name
            name: chat.messages.length === 0 ? 
              (messageText.length > 30 ? `${messageText.substring(0, 30)}...` : messageText) : 
              chat.name
          } 
        : chat
    )
  );
  
  setQuestion("");
  
  try {
    // Send message to backend API
    const response = await sendChatMessage(messageText);
    
    if (response.response) {
      // Add assistant response to messages
      const assistantMessage = response.response;
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update the active chat with the assistant response
      setChats(prevChats => 
        prevChats.map(chat => 
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
        id: uuidv4() 
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setChats(prevChats => 
        prevChats.map(chat => 
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
      id: uuidv4() 
    };
    
    setMessages(prev => [...prev, errorMessage]);
    setChats(prevChats => 
      prevChats.map(chat => 
        chat.id === activeChat 
          ? { ...chat, messages: [...chat.messages, errorMessage] } 
          : chat
      )
    );
  } finally {
    setIsLoading(false);
  }
}

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
        chats={chats}
        activeChat={activeChat}
        onSelectChat={selectChat}
        onNewChat={createNewChat}
      />
      
      <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4" ref={messagesContainerRef}>
        {messages.length == 0 && <Overview />}
        {messages.map((message, index) => (
          <PreviewMessage key={index} message={message} />
        ))}
        {isLoading && <ThinkingMessage />}
        <div ref={messagesEndRef} className="shrink-0 min-w-[24px] min-h-[24px]"/>
      </div>
      <div className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <ChatInput  
          question={question}
          setQuestion={setQuestion}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
