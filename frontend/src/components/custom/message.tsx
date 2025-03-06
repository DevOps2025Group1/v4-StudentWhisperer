import { motion } from "framer-motion";
import { cx } from "classix";
import { SparklesIcon } from "./icons";
import { Markdown } from "./markdown";
import { message } from "../../interfaces/interfaces";
import { MessageActions } from "@/components/custom/actions";

export const PreviewMessage = ({ message }: { message: message }) => {
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div
        className={cx(
          "group-data-[role=user]/message:bg-zinc-700 dark:group-data-[role=user]/message:bg-muted group-data-[role=user]/message:text-white flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl"
        )}
      >
        {message.role === "assistant" && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div className="flex flex-col w-full">
          {message.content && (
            <div className="flex flex-col gap-4 text-left">
              <Markdown>{message.content}</Markdown>
            </div>
          )}

          {message.role === "assistant" && <MessageActions message={message} />}
        </div>
      </div>
    </motion.div>
  );
};

const LoadingDots = () => {
  return (
    <div className="flex space-x-1.5 items-center">
      <motion.span
        className="block w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-300"
        initial={{ opacity: 0.5, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.6,
          delay: 0,
        }}
      />
      <motion.span
        className="block w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-300"
        initial={{ opacity: 0.5, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.6,
          delay: 0.2,
        }}
      />
      <motion.span
        className="block w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-300"
        initial={{ opacity: 0.5, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          repeat: Infinity,
          repeatType: "reverse",
          duration: 0.6,
          delay: 0.4,
        }}
      />
    </div>
  );
};

export const ThinkingMessage = () => {
  const role = "assistant";
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 0.2 } }}
      data-role={role}
    >
      <div className="flex gap-4 w-full rounded-xl items-center py-3">
        <motion.div
          className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background"
          animate={{
            boxShadow: [
              "0 0 0 rgba(120, 120, 255, 0)",
              "0 0 8px rgba(120, 120, 255, 0.5)",
              "0 0 0 rgba(120, 120, 255, 0)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <SparklesIcon size={14} />
          </motion.div>
        </motion.div>
        <div className="flex items-center py-3">
          <LoadingDots />
        </div>
      </div>
    </motion.div>
  );
};
