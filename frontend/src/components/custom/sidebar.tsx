import { Button } from "@/components/ui/button";
import { PlusCircle, MessageCircle, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Chat {
  id: string;
  name: string;
  messages: any[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleteChat?: (chatId: string) => void;
  chats: Chat[];
  activeChat: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  onDeleteChat,
  chats,
  activeChat,
  onSelectChat,
  onNewChat,
}: SidebarProps) {
  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (onDeleteChat) {
      onDeleteChat(chatId);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 w-64 bg-background border-r transform transition-transform duration-200 ease-in-out z-50",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Chats</h2>
          <Button variant="ghost" size="icon" className="size-9 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Button
          onClick={onNewChat}
          className="mb-4 flex items-center gap-2"
          variant="ghost"
          size="sm"
        >
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {chats.map((chat) => (
              <div key={chat.id} className="group relative flex items-center">
                <Button
                  variant={activeChat === chat.id ? "secondary" : "ghost"}
                  className="flex-grow justify-start gap-2 pl-3 pr-8 text-left rounded-lg overflow-hidden w-full"
                  onClick={() => onSelectChat(chat.id)}
                >
                  <MessageCircle className="h-4 w-4 shrink-0" />
                  <span className="truncate max-w-[150px] inline-block">
                    {chat.name}
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "absolute right-2 h-6 w-6 min-w-0 p-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 rounded-md",
                    activeChat === chat.id
                      ? "hover:bg-primary/20"
                      : "hover:bg-muted"
                  )}
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
            {chats.length === 0 && (
              <p className="text-sm text-muted-foreground px-2">No chats yet</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
