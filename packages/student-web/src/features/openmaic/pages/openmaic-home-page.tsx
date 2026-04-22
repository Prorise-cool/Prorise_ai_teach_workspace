/**
 * OpenMAIC 首页 — 输入主题 + 最近课堂入口。
 * Scaffold — Team B 实际实现中。
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GlobalTopNav } from '@/components/navigation/global-top-nav';

export function OpenMAICHomePage() {
	const [topic, setTopic] = useState('');
	const navigate = useNavigate();

	const handleSubmit = () => {
		if (!topic.trim()) return;
		// Team B/A wires real submission; this scaffold only navigates to a placeholder id
		const draftId = `draft-${Date.now()}`;
		navigate(`/openmaic/classroom/${draftId}`, { state: { topic } });
	};

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<GlobalTopNav links={[]} variant="surface" />
			<main className="flex flex-1 items-center justify-center px-6 py-10">
				<div className="w-full max-w-2xl space-y-6 text-center">
					<div className="space-y-2">
						<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
							OpenMAIC
						</p>
						<h1 className="text-3xl font-bold text-foreground md:text-4xl">
							一句话，生成多智能体课堂
						</h1>
						<p className="text-sm text-muted-foreground">
							输入你想学的主题，AI 老师与同学将为你打造一堂完整的互动课。
						</p>
					</div>
					<div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
						<textarea
							value={topic}
							onChange={(event) => setTopic(event.target.value)}
							placeholder="例如：教我微积分中的链式法则，给出例题并让 AI 同学讨论"
							className="h-32 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
						/>
						<div className="mt-3 flex items-center justify-between">
							<span className="text-xs text-muted-foreground">
								{topic.trim().length} / 2000
							</span>
							<button
								type="button"
								onClick={handleSubmit}
								disabled={!topic.trim()}
								className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
							>
								生成课堂
							</button>
						</div>
					</div>
					<p className="text-xs text-muted-foreground">
						Scaffold — Team B 正在移植完整交互 / 最近课堂列表 / PDF 上传 / Web 搜索开关。
					</p>
				</div>
			</main>
		</div>
	);
}
