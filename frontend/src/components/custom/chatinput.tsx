import { Textarea } from "../ui/textarea";
import { cx } from "classix";
import { Button } from "../ui/button";
import { ArrowUpIcon } from "./icons";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";

interface ChatInputProps {
  question: string;
  setQuestion: (question: string) => void;
  onSubmit: (text?: string) => void;
  isLoading: boolean;
  isNewChat?: boolean;
}

const suggestedActions = [
  {
    title: "What courses do I still need to take",
    label: "to graduate my program?",
    action: "What courses do I still need to take to graduate my program?",
  },
  {
    title: "What grades did I receive",
    label: "this year?",
    action: "What grades did I receive this year?",
  },
];

export const ChatInput = ({
  question,
  setQuestion,
  onSubmit,
  isLoading,
  isNewChat = false,
}: ChatInputProps) => {
  const [showSuggestions, setShowSuggestions] = useState(isNewChat);

  // Update showSuggestions whenever isNewChat changes
  useEffect(() => {
    setShowSuggestions(isNewChat);
  }, [isNewChat]);

  return (
    <div className="relative w-full flex flex-col gap-4">
      {showSuggestions && isNewChat && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
          {suggestedActions.map((suggestedAction, index) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.05 * index }}
              key={index}
            >
              <Button
                variant="ghost"
                onClick={() => {
                  const text = suggestedAction.action;
                  onSubmit(text);
                  setShowSuggestions(false);
                }}
                className="text-left border rounded-xl px-4 py-3.5 text-sm flex-1 gap-1 sm:flex-col w-full h-auto justify-start items-start"
              >
                <span className="font-medium">{suggestedAction.title}</span>
                <span className="text-muted-foreground">
                  {suggestedAction.label}
                </span>
              </Button>
            </motion.div>
          ))}
        </div>
      )}
      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        multiple
        tabIndex={-1}
      />
      <Textarea
        placeholder="Send a message..."
        className={cx(
          "min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-xl text-base bg-muted"
        )}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (isLoading) {
              toast.error("Please wait for the model to finish its response!");
            } else {
              setShowSuggestions(false);
              onSubmit();
            }
          }
        }}
        rows={3}
        autoFocus
      />
      <Button
        className="rounded-full p-1.5 h-fit absolute bottom-2 right-2 m-0.5 border dark:border-zinc-600"
        onClick={() => {
          setShowSuggestions(false);
          onSubmit(question);
        }}
        disabled={question.length === 0}
      >
        <ArrowUpIcon size={14} />
      </Button>
    </div>
  );
};
