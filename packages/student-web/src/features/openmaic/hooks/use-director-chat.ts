/**
 * 多智能体讨论 Hook。
 * 发送用户消息，接收 SSE 流式回复，更新聊天消息状态。
 */
import { nanoid } from 'nanoid';
import { useCallback, useRef, useState } from 'react';

import { saveChatHistory } from '../db/classroom-db';
import { streamChat } from '../api/openmaic-adapter';
import { useClassroomStore } from '../store/classroom-store';
import type { ChatMessage } from '../types/chat';

export interface UseDirectorChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useDirectorChat(classroomId: string): UseDirectorChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const currentSceneId = useClassroomStore((s) => s.currentSceneId);
  const agents = useClassroomStore((s) => s.agents);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      const userMsg: ChatMessage = {
        id: nanoid(),
        role: 'user',
        content: text,
        createdAt: Date.now(),
      };

      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setIsStreaming(true);

      // 占位 assistant 消息
      const assistantId = nanoid();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        agentId: agents[0]?.id,
        agentName: agents[0]?.name ?? '老师',
        agentColor: agents[0]?.color,
        createdAt: Date.now(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      try {
        const stream = streamChat(
          {
            messages: nextMessages,
            storeState: { classroomId, currentSceneId },
            config: {
              agentIds: agents.map((a) => a.id),
              sessionType: 'qa',
            },
          },
          ac.signal,
        );

        let fullContent = '';
        let currentAgentId: string | undefined = agents[0]?.id;
        let currentAgentName: string = agents[0]?.name ?? '老师';
        let currentAgentColor: string | undefined = agents[0]?.color;

        for await (const event of stream) {
          if (event.type === 'agent_start') {
            currentAgentId = event.data.agentId;
            currentAgentName = event.data.agentName;
            currentAgentColor = event.data.agentColor;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, agentId: currentAgentId, agentName: currentAgentName, agentColor: currentAgentColor }
                  : m,
              ),
            );
          } else if (event.type === 'text_delta') {
            fullContent += event.data.content;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: fullContent } : m,
              ),
            );
          } else if (event.type === 'done') {
            break;
          } else if (event.type === 'error') {
            throw new Error(event.data.message);
          }
        }

        // 完成流式 — 更新最终消息
        const finalMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: fullContent,
          agentId: currentAgentId,
          agentName: currentAgentName,
          agentColor: currentAgentColor,
          createdAt: Date.now(),
          isStreaming: false,
        };

        setMessages((prev) => {
          const updated = prev.map((m) => (m.id === assistantId ? finalMsg : m));
          void saveChatHistory(classroomId, updated);
          return updated;
        });
      } catch (error) {
        if (ac.signal.aborted) return;
        const errMsg = error instanceof Error ? error.message : '聊天出错';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `错误：${errMsg}`, isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, classroomId, currentSceneId, agents],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
