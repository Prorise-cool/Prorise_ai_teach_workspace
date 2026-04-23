/**
 * 多智能体讨论 Hook。
 * 发送用户消息，接收 SSE 流式回复，更新聊天消息状态。
 */
import { nanoid } from 'nanoid';
import { useCallback, useRef, useState } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';
import { resolveClassroomAdapter } from '@/services/api/adapters/classroom-adapter';

import { saveChatHistory } from '../db/classroom-db';
import { useClassroomStore } from '../stores/classroom-store';
import type { ChatMessage } from '../types/chat';

export interface UseDirectorChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearMessages: () => void;
}

export function useDirectorChat(classroomId: string): UseDirectorChatReturn {
  const { t } = useAppTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const adapter = resolveClassroomAdapter();
  const currentSceneId = useClassroomStore((s) => s.currentSceneId);
  const agents = useClassroomStore((s) => s.agents);
  const classroom = useClassroomStore((s) => s.classroom);

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
        agentName: agents[0]?.name ?? t('classroom.common.teacher'),
        agentColor: agents[0]?.color,
        createdAt: Date.now(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // 把画布当前场景标题 + 课程要求拼成 classroom_context 传给后端，
      // 让 Director 理解此刻学生的讨论上下文。
      const currentScene = classroom?.scenes?.find((s) => s.id === currentSceneId);
      const classroomContext = [
        classroom?.name ? t('classroom.common.topicLabel', { name: classroom.name }) : '',
        currentScene?.title ? t('classroom.common.sceneLabel', { title: currentScene.title }) : '',
      ]
        .filter(Boolean)
        .join(' | ');

      try {
        const stream = adapter.streamChat(
          {
            // 后端 ChatRequest 形状：{messages, agents, classroomContext, languageDirective}
            messages: nextMessages.map((m) => ({
              role: m.role,
              content: m.content,
              agentId: m.agentId,
            })),
            agents,
            classroomContext,
            // 保留旧字段以防其他消费者依赖
            storeState: { classroomId, currentSceneId },
            config: {
              agentIds: agents.map((a) => a.id),
              sessionType: 'qa',
            },
          },
          { signal: ac.signal },
        );

        let fullContent = '';
        let currentAgentId: string | undefined = agents[0]?.id;
        let currentAgentName: string = agents[0]?.name ?? t('classroom.common.teacher');
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
        const errMsg = error instanceof Error ? error.message : t('classroom.common.chatError');
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `${t('classroom.common.errorPrefix')}${errMsg}`, isStreaming: false }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, classroomId, currentSceneId, agents, adapter, classroom, t],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isStreaming, sendMessage, clearMessages };
}
