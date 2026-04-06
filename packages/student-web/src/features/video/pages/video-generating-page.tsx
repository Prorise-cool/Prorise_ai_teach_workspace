/**
 * 文件说明：视频任务生成页。
 * 当前在 Story 3.2 下仅作为前端 mock 闭环，使用定时器模拟生成过程，并复用共享等待组件。
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  TaskGeneratingView,
  type GeneratingLogItem,
} from '@/components/generating/task-generating-view';

const MOCK_TIPS = [
  '小麦提示：生成完毕后，您还可以通过自然语言二次修改画面。',
  '复杂的数学公式推导，小麦会自动为您添加高亮引导。',
  '视频渲染过程需要在云端进行大量计算，感谢您的耐心等待。',
  '您可以随时切换板书风格、讲师音色和教学节奏。',
  '生成历史会自动保存在您的工作台，随时可以回来查看。',
];

/**
 * 渲染视频等待页。
 *
 * @returns 视频生成进度页。
 */
export function VideoGeneratingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [etaText, setEtaText] = useState('初始化中，即将开始任务...');
  const [statusTitle, setStatusTitle] = useState('准备生成视频');
  const [logs, setLogs] = useState<GeneratingLogItem[]>([]);

  const handleReturn = () => {
    navigate('/video/input');
  };

  // 模拟 SSE 进度
  useEffect(() => {
    let timer: number;
    let stage = 0;

    const stages = [
      {
        time: 1000,
        progress: 10,
        title: '题目理解与知识库检索',
        eta: '预计还需要 3 分钟',
        logs: [{ id: '1', status: 'pending', text: '正在解析任务语义...', tag: 'Understanding' } as GeneratingLogItem],
      },
      {
        time: 2500,
        progress: 30,
        title: '生成分镜与代码',
        eta: '预计还需要 2 分半',
        logs: [
          { id: '1', status: 'success', text: '题目语义解析完成', tag: 'Understanding' },
          { id: '2', status: 'pending', text: '正在生成 Manim 动画脚本', tag: 'Code Gen' },
        ] as GeneratingLogItem[],
      },
      {
        time: 4500,
        progress: 50,
        title: '正在渲染动画帧',
        eta: '预计还需要 2 分钟，后台会自动完成',
        logs: [
          { id: '1', status: 'success', text: '题目语义解析完成' },
          { id: '2', status: 'success', text: '分镜脚本与 Manim 代码生成完毕', tag: 'Code Gen' },
          { id: '3', status: 'pending', text: '沙箱环境运行中：正在渲染 Manim 动画帧' },
        ] as GeneratingLogItem[],
      },
      {
        time: 7000,
        progress: 90,
        title: '视频合成中',
        eta: '马上就好！即将为您展现最终内容...',
        logs: [
          { id: '1', status: 'success', text: '题目语义解析完成' },
          { id: '2', status: 'success', text: '分镜脚本与 Manim 代码生成完毕' },
          { id: '3', status: 'success', text: '沙箱渲染 Manim 动画帧成功' },
          { id: '4', status: 'success', text: 'TTS 语音轨道合成完毕' },
          { id: '5', status: 'pending', text: '正在合成最终视频并推送到云端...' },
        ] as GeneratingLogItem[],
      },
      {
        time: 8500,
        progress: 100,
        title: '生成完毕',
        eta: '正在跳转到结果页...',
        logs: [
          { id: '1', status: 'success', text: '题目语义解析完成' },
          { id: '2', status: 'success', text: '分镜脚本与 Manim 代码生成完毕' },
          { id: '3', status: 'success', text: '沙箱渲染 Manim 动画帧成功' },
          { id: '4', status: 'success', text: 'TTS 语音轨道合成完毕' },
          { id: '5', status: 'success', text: '视频云端就绪' },
        ] as GeneratingLogItem[],
      },
    ];

    const runNextStage = () => {
      if (stage >= stages.length) {
        // 完成后跳转至回看页，由于没有结果页，临时跳转回 input
        const timeout = setTimeout(() => {
          navigate('/video/input');
        }, 1500);
        return () => clearTimeout(timeout);
      }

      const current = stages[stage]!;
      setProgress(current.progress);
      setEtaText(current.eta);
      setStatusTitle(current.title);
      setLogs(current.logs);

      stage++;
      timer = window.setTimeout(runNextStage, stage === 1 ? current.time : current.time - stages[stage - 2]!.time);
    };

    runNextStage();

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <TaskGeneratingView
      title={statusTitle}
      etaText={etaText}
      progress={progress}
      logs={logs}
      tips={MOCK_TIPS}
      onReturn={handleReturn}
    />
  );
}
