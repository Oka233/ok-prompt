import { StreamCallbacks } from '@/types/model';

/**
 * 根据指定的标签过滤内容。
 * 如果找到完整的标签对，则返回标签内的内容并设置 closed 为 true。
 * 如果没有找到完整的标签对，则根据部分标签规则过滤内容，并设置 closed 为 false。
 *
 * @param text 要过滤的文本字符串。
 * @param tag 要查找的 HTML 标签名称 (例如 "summary", "div")。
 * @returns 一个包含 closed (布尔值), content (过滤后的字符串), 和 hasPartialOpenTag (布尔值) 的对象。
 *          hasPartialOpenTag 为 true 表示匹配到了部分或全部开始标签，该标签影响了最终返回的内容。
 */
export function filterContentByTag(
  text: string | undefined,
  tag: string
): { closed: boolean; content: string; hasPartialOpenTag: boolean } {
  // 确保处理 undefined 或空字符串的情况
  if (!text) {
    return { closed: false, content: '', hasPartialOpenTag: false };
  }

  const openTag = `<${tag}>`;
  const closeTag = `</${tag}>`;

  // 1. 检查是否存在完整的标签对
  //    我们寻找最后一个开标签，以及它之后最近的闭合标签，以处理嵌套或多个同名标签的情况。
  const lastOpenTagIndex = text.lastIndexOf(openTag);
  if (lastOpenTagIndex !== -1) {
    const firstCloseTagIndexAfterLastOpen = text.indexOf(closeTag, lastOpenTagIndex + openTag.length);
    if (firstCloseTagIndexAfterLastOpen !== -1) {
      // 找到了完整的标签对
      return {
        closed: true,
        content: text.substring(lastOpenTagIndex + openTag.length, firstCloseTagIndexAfterLastOpen).trim(),
        hasPartialOpenTag: true,
      };
    }
  }

  // 2. 如果没有找到完整的标签对，则按照原始逻辑进行内容过滤
  let currentContent = text;
  let determinedHasPartialOpenTag = false;

  // 如果字符串末尾匹配部分结束标签，则删除该部分
  // 这个操作本身不意味着我们找到了一个“部分开始标签”，所以不在这里设置 determinedHasPartialOpenTag
  for (let i = closeTag.length; i >= 1; i--) {
    const partialEndTag = closeTag.substring(0, i);
    if (currentContent.endsWith(partialEndTag)) {
      currentContent = currentContent.substring(0, currentContent.length - partialEndTag.length);
      break; // 只删除最长的匹配部分
    }
  }

  // 检查是否存在完整的开标签（在处理完部分闭合标签之后的内容中）
  // 这个开标签没有对应的闭合标签（否则会在步骤1中处理掉）
  const lastCompleteOpenTagIndexInCurrent = currentContent.lastIndexOf(openTag);
  if (lastCompleteOpenTagIndexInCurrent !== -1) {
    // 找到了一个完整的开标签，但没有闭合它。内容是这个开标签之后的部分。
    determinedHasPartialOpenTag = true;
    return {
      closed: false,
      content: currentContent.substring(lastCompleteOpenTagIndexInCurrent + openTag.length).trim(),
      hasPartialOpenTag: determinedHasPartialOpenTag,
    };
  } else {
    // 没有找到完整的开标签，现在检查是否存在部分开标签在字符串末尾
    for (let i = openTag.length - 1; i >= 1; i--) {
      const partialOpenTag = openTag.substring(0, i);
      if (currentContent.endsWith(partialOpenTag)) {
        // 找到了部分开标签，内容是该部分之前的内容
        determinedHasPartialOpenTag = true;
        return {
          closed: false,
          content: currentContent.substring(0, currentContent.length - partialOpenTag.length).trim(),
          hasPartialOpenTag: determinedHasPartialOpenTag,
        };
      }
    }
  }

  // 3. 如果没有找到任何影响内容的开标签（完整的或部分的在末尾），
  //    返回当前处理过的内容（可能已去除部分闭合标签）。
  //    此时 determinedHasPartialOpenTag 仍然是 false。
  return {
    closed: false,
    content: currentContent.trim(),
    hasPartialOpenTag: determinedHasPartialOpenTag,
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
  throttleInterval: number = 100
) {
  return async function(messages: any[], callbacks: StreamCallbacks, options?: any): Promise<ReturnType<T>> {
    // 创建节流版本的 onContent 回调
    let lastCallTime = 0;

    // 节流处理函数
    const throttledOnContent = (thought: string, answer: string) => {

      const now = Date.now();
      
      // 如果距离上次调用时间不足，则延迟调用
      if (now - lastCallTime < throttleInterval) {
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
        // 最后一次 onContent 回调中包含最新的内容
        callbacks.onContent(thought, answer);

        // 调用原始 onComplete 回调
        callbacks.onComplete!(thought, answer);
      } : undefined
    };

    // 用修改后的回调调用原始函数
    return generateStreamFn(messages, throttledCallbacks, options);
  };
}

/**
 * 如果字符串为空或仅包含空格，返回占位字符串。
 *
 * @param text 输入字符串。
 * @param placeholder 占位字符串，默认为 "..."。
 * @returns 如果字符串为空或仅包含空格，返回占位字符串，否则返回原字符串。
 */
export function getPlaceholderIfEmpty(text: string, placeholder: string = '...'): string {
  return text.trim() === '' ? placeholder : text;
}
