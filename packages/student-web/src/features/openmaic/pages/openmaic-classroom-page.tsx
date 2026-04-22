/**
 * OpenMAIC 课堂播放页 — 三栏布局：课程大纲 / 主画布（幻灯片+白板）/ 智能体讨论。
 * Scaffold — Team B 实际实现中。
 */
import { useParams } from 'react-router-dom';

import { GlobalTopNav } from '@/components/navigation/global-top-nav';

export function OpenMAICClassroomPage() {
	const { classroomId } = useParams<{ classroomId: string }>();

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<GlobalTopNav links={[]} variant="surface" />
			<main className="flex flex-1 overflow-hidden">
				<aside className="hidden w-[260px] shrink-0 border-r border-border bg-card md:block">
					<div className="p-4">
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
							课程大纲
						</p>
						<p className="mt-4 text-xs text-muted-foreground">
							Scaffold：场景缩略图列表 by Team B
						</p>
					</div>
				</aside>
				<section className="flex flex-1 items-center justify-center p-6">
					<div className="aspect-video w-full max-w-5xl rounded-3xl border border-border bg-card p-8 shadow-lg">
						<div className="flex h-full flex-col items-center justify-center gap-3 text-center">
							<h1 className="text-2xl font-bold text-foreground">
								课堂 {classroomId}
							</h1>
							<p className="text-sm text-muted-foreground">
								Scaffold：幻灯片渲染 / 白板 / 智能体头像 / 播放控制 由 Team B 填充。
							</p>
						</div>
					</div>
				</section>
				<aside className="hidden w-[300px] shrink-0 border-l border-border bg-card xl:block xl:w-[340px]">
					<div className="p-4">
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
							讨论 / 笔记
						</p>
						<p className="mt-4 text-xs text-muted-foreground">
							Scaffold：多智能体讨论面板 by Team B
						</p>
					</div>
				</aside>
			</main>
		</div>
	);
}
