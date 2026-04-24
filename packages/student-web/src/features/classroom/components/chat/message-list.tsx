/**
 * 聊天消息列表 —— 1:1 移植自 OpenMAIC 聊天气泡样式。
 *
 * 视觉要点：
 *   - 用户气泡：右对齐，primary 填充，`rounded-2xl rounded-br-sm`（右下尾巴）
 *   - AI 气泡：左对齐，card + border，`rounded-2xl rounded-bl-sm`（左下尾巴）
 *   - AI 消息上方有 agentName 小字，颜色取 agent.color
 *   - 头像用 `<AgentAvatar size="sm" />`
 */
import type { FC } from 'react';
import { useEffect, useRef } from 'react';

import { useAppTranslation } from '@/app/i18n/use-app-translation';

import type { ChatMessage } from '../../types/chat';
import { AgentAvatar } from '../agent/agent-avatar';

interface MessageListProps {
	messages: ChatMessage[];
}

export const MessageList: FC<MessageListProps> = ({ messages }) => {
	const { t } = useAppTranslation();
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	if (messages.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center p-3 min-h-full">
				<p className="text-xs text-muted-foreground">{t('classroom.chat.qaEmpty')}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-3 p-3">
			{messages.map((msg) => (
				<MessageBubble key={msg.id} message={msg} />
			))}
			<div ref={bottomRef} />
		</div>
	);
};

const MessageBubble: FC<{ message: ChatMessage }> = ({ message }) => {
	const { t } = useAppTranslation();
	const isUser = message.role === 'user';

	if (isUser) {
		return (
			<div className="flex justify-end">
				<div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
					{message.content}
				</div>
			</div>
		);
	}

	const agentName = message.agentName ?? t('classroom.common.assistant');
	const agentColor = message.agentColor ?? '#0091FF';

	return (
		<div className="flex items-start gap-2">
			<AgentAvatar name={agentName} color={agentColor} size="sm" />
			<div className="flex flex-col max-w-[80%]">
				{message.agentName && (
					<span className="text-[11px] text-muted-foreground mb-1" style={{ color: agentColor }}>
						{message.agentName}
					</span>
				)}
				<div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-foreground">
					{message.content || (
						<span className="inline-flex gap-0.5">
							<span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0s]" />
							<span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.16s]" />
							<span className="h-1 w-1 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.32s]" />
						</span>
					)}
				</div>
			</div>
		</div>
	);
};
