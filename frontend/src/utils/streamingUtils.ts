import { StreamCallbacks } from '@/types/model';

/**
 * 根据指定的标签过滤内容。
 * 如果找到完整的标签对，则返回标签内的内容并设置 closed 为 true。
 * 如果没有找到完整的标签对，则根据部分标签规则过滤内容，并设置 closed 为 false。
 *
 * @param text 要过滤的文本字符串。
 * @param tag 要查找的 HTML 标签名称 (例如 "summary", "div")。
 * @returns 一个包含 closed (布尔值) 和 content (过滤后的字符串) 的对象。
 */
export function filterContentByTag(text: string | undefined, tag: string): { closed: boolean; content: string } {
  // 确保处理 undefined 或空字符串的情况
  if (!text) {
    return { closed: false, content: '' };
  }

  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;

  // 1. 检查是否存在完整的标签对
  const lastOpenTagIndex = text.lastIndexOf(openTag);
  if (lastOpenTagIndex !== -1) {
    const firstCloseTagIndexAfterLastOpen = text.indexOf(closeTag, lastOpenTagIndex + openTag.length);
    if (firstCloseTagIndexAfterLastOpen !== -1) {
      // 找到了完整的标签对，返回 true 和标签内的内容
      return {
        closed: true,
        content: text.substring(lastOpenTagIndex + openTag.length, firstCloseTagIndexAfterLastOpen)
      };
    }
  }

  // 2. 如果没有找到完整的标签对，则按照原始逻辑进行内容过滤
  let currentContent = text;

  // 如果字符串末尾匹配部分结束标签，则删除该部分
  for (let i = closeTag.length; i >= 1; i--) {
    const partialEndTag = closeTag.substring(0, i);
    if (currentContent.endsWith(partialEndTag)) {
      currentContent = currentContent.substring(0, currentContent.length - partialEndTag.length);
      break; // 只删除最长的匹配部分
    }
  }

  // 检查是否存在完整的开标签（在处理完部分闭合标签之后）
  const lastCompleteOpenTagIndexInCurrent = currentContent.lastIndexOf(openTag);
  if (lastCompleteOpenTagIndexInCurrent !== -1) {
    // 此时虽然有开标签，但没有完整闭合，所以认为是部分匹配
    return {
      closed: false,
      content: currentContent.substring(lastCompleteOpenTagIndexInCurrent + openTag.length)
    };
  } else {
    // 检查是否存在部分开标签
    for (let i = openTag.length - 1; i >= 1; i--) {
      const partialOpenTag = openTag.substring(0, i);
      if (currentContent.endsWith(partialOpenTag)) {
        return {
          closed: false,
          content: currentContent.substring(0, currentContent.length - partialOpenTag.length)
        };
      }
    }
  }

  // 3. 如果没有找到任何标签或部分标签，返回原始内容
  return {
    closed: false,
    content: currentContent
  };
}

/**
 * 创建一个节流版本的 generateCompletionStream 函数
 * 
 * @param generateStreamFn 原始的流式生成函数
 * @param throttleInterval 节流间隔，单位为毫秒，默认为 200ms
 * @returns 返回一个节流后的函数，接口与原始函数相同
 */
export function createThrottledStreamGenerator<T extends (messages: any[], callbacks: StreamCallbacks, options?: any) => Promise<any>>(
  generateStreamFn: T,
  throttleInterval: number = 200
) {
  return async function(messages: any[], callbacks: StreamCallbacks, options?: any): Promise<ReturnType<T>> {
    // 创建节流版本的 onContent 回调
    let lastCallTime = 0;
    let scheduledCall: NodeJS.Timeout | null = null;
    let latestThought: string = '';
    let latestAnswer: string = '';
    let isClosed = false;

    // 节流处理函数
    const throttledOnContent = (thought: string, answer: string) => {
      latestThought = thought;
      latestAnswer = answer;

      const now = Date.now();
      
      // 如果已经关闭或者距离上次调用时间不足，则延迟调用
      if (isClosed || now - lastCallTime < throttleInterval) {
        if (scheduledCall === null) {
          scheduledCall = setTimeout(() => {
            // 只有在未关闭的情况下才执行回调
            if (!isClosed) {
              callbacks.onContent(latestThought, latestAnswer);
              lastCallTime = Date.now();
            }
            scheduledCall = null;
          }, Math.max(0, throttleInterval - (now - lastCallTime)));
        }
        return;
      }

      // 可以立即执行回调
      callbacks.onContent(thought, answer);
      lastCallTime = now;
    };

    // 创建修改后的回调对象
    const throttledCallbacks: StreamCallbacks = {
      ...callbacks,
      onContent: throttledOnContent,
      onComplete: callbacks.onComplete ? (thought: string, answer: string) => {
        // 标记为已关闭，取消任何待处理的节流调用
        isClosed = true;
        if (scheduledCall !== null) {
          clearTimeout(scheduledCall);
          scheduledCall = null;
        }

        // 确保最后一次调用回调中包含最新的内容
        if (latestThought !== thought || latestAnswer !== answer) {
          callbacks.onContent(thought, answer);
        }

        // 调用原始 onComplete 回调
        callbacks.onComplete!(thought, answer);
      } : undefined
    };

    // 用修改后的回调调用原始函数
    return generateStreamFn(messages, throttledCallbacks, options);
  };
}