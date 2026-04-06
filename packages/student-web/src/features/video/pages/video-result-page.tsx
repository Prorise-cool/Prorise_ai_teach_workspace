/**
 * 文件说明：视频结果页占位（Story 4.7 将实现完整结果展示）。
 * 当前仅展示占位 UI，确保等待页 completed 跳转有落地路由。
 */
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';

/**
 * 渲染视频结果页占位。
 *
 * @returns 结果页占位 UI。
 */
export function VideoResultPage() {
  const { id: taskId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 gap-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          视频生成完成
        </h2>
        <p className="text-sm text-muted-foreground">
          任务 {taskId} 已完成，结果展示功能将在后续版本中上线。
        </p>
      </div>
      <Button
        variant="default"
        onClick={() => void navigate('/video/input')}
      >
        返回创建新视频
      </Button>
    </div>
  );
}
