/**
 * 聊天消息列表组件。
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
			<div className="flex flex-1 items-center justify-center py-8">
				<p className="text-xs text-muted-foreground">{t('classroom.chat.qaEmpty')}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 px-3 py-3">
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
			<div className="flex items-start gap-2 justify-end">
				<div className="max-w-[80%] rounded-xl rounded-tr-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
					{message.content}
				</div>
				<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] text-muted-foreground">
					{t('classroom.chat.me')}
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-start gap-2">
			<AgentAvatar
				name={message.agentName ?? t('classroom.common.assistant')}
				color={message.agentColor ?? '#0091FF'}
				size="sm"
			/>
			<div className="flex flex-col gap-0.5 max-w-[85%]">
				{message.agentName && (
					<span className="text-[10px] font-bold" style={{ color: message.agentColor }}>
						{message.agentName}
					</span>
				)}
				<div className="rounded-xl rounded-tl-sm bg-card px-3 py-2 text-xs leading-relaxed text-foreground border border-border">
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
