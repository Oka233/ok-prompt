import { ModelMessage } from "@/types/model";

export const adaptQwen3ThinkingPrompt = (
  messages: ModelMessage[],
  enableThinking: boolean
): ModelMessage[] => {
  if (messages.length === 0) return messages; // 处理空数组情况
  const softSwitch = enableThinking ? '/think' : '/no_think';
  const lastMessage = messages[messages.length - 1];
  // 创建新数组并修改最后一个元素
  return [
    ...messages.slice(0, -1),
    {
      ...lastMessage,
      content: `${lastMessage.content}${softSwitch}`,
    },
  ];
};