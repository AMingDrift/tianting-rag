"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";
import { QUERY_LIST } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Chat() {
  const [input, setInput] = useState("");
  const [messagesHeight, setMessagesHeight] = useState("auto");
  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, sendMessage } = useChat();

  useEffect(() => {
    const calculateHeights = () => {
      if (formRef.current) {
        const formHeight = formRef.current.offsetHeight;
        const screenHeight = window.innerHeight;
        const headerHeight = 20; // pt-5 = 1.25rem = 20px
        const availableHeight = screenHeight - formHeight - headerHeight;
        setMessagesHeight(`${availableHeight}px`);
      }
    };

    // 初始计算
    calculateHeights();

    // 窗口大小改变时重新计算
    window.addEventListener("resize", calculateHeights);

    // 观察表单尺寸变化
    const resizeObserver = new ResizeObserver(calculateHeights);
    if (formRef.current) {
      resizeObserver.observe(formRef.current);
    }

    return () => {
      window.removeEventListener("resize", calculateHeights);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    // 消息变化时滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col min-h-screen w-full items-center backdrop-blur-md">
      <div className="flex flex-col w-full flex-1 items-center pt-5  ">
        <div
          className="size-full flex flex-col gap-4 items-center overflow-auto  scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700"
          style={{ height: messagesHeight }}
        >
          <div className="max-w-4xl px-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`w-full flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`whitespace-pre-wrap px-4 py-2 rounded-2xl max-w-[80%] break-words shadow-md mb-2 ${
                    message.role === "user"
                      ? "bg-blue-100 text-blue-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case "text":
                        return (
                          <div key={`${message.id}-${i}`}>{part.text}</div>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
      <form
        ref={formRef}
        className="w-full max-w-4xl flex flex-col items-center gap-1 fixed bottom-0 left-1/2 -translate-x-1/2 rounded-md bg-white/80 dark:bg-zinc-9550/80 pb-6 pt-2 px-4 border-t border-zinc-200 dark:border-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput("");
        }}
      >
        <div className="flex flex-wrap gap-1 justify-start w-full mb-1 overflow-x-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="cursor-pointer rounded-xl px-4 py-2"
                type="button"
              >
                常见问题
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-60 overflow-y-auto max-w-[90dvw]">
              {QUERY_LIST.map((q, idx) => (
                <DropdownMenuItem
                  key={idx}
                  className="cursor-pointer py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-800 whitespace-normal break-words"
                  onClick={() => {
                    sendMessage({ text: q });
                    setInput("");
                  }}
                >
                  {q}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <input
          className="w-full p-3 border border-zinc-300 dark:border-zinc-800 rounded-xl shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={input}
          placeholder="请问一些关于《天听计划》的问题..."
          onChange={(e) => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}
