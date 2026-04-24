/**
 * 文件说明：验证 TaskGeneratingShell 关键视觉钩子（进度、标题、onCancel、色系切换）。
 */
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithApp } from '@/test/utils/render-app';

import { TaskGeneratingShell } from './task-generating-shell';

describe('TaskGeneratingShell', () => {
  it('clamps progress to 0-100 and renders rounded percentage', () => {
    renderWithApp(
      <TaskGeneratingShell
        title="Test Title"
        progress={150}
        stageLabel="Stage A"
        logs={[]}
      />,
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('renders title, stage label and eta text together', () => {
    renderWithApp(
      <TaskGeneratingShell
        title="Classroom Builder"
        progress={25}
        stageLabel="Planning outline"
        etaText="~2 min"
        logs={[]}
      />,
    );

    expect(screen.getByText('Classroom Builder')).toBeInTheDocument();
    expect(screen.getByText(/Planning outline/)).toBeInTheDocument();
    expect(screen.getByText(/~2 min/)).toBeInTheDocument();
  });

  it('invokes onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderWithApp(
      <TaskGeneratingShell
        title="Test"
        progress={10}
        stageLabel="Stage"
        logs={[]}
        onCancel={onCancel}
        cancelLabel="Cancel"
      />,
    );

    await user.click(screen.getByRole('button', { name: /Cancel/ }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('applies the indigo color scheme via data attribute', () => {
    const { container } = renderWithApp(
      <TaskGeneratingShell
        title="Test"
        progress={10}
        stageLabel="Stage"
        logs={[]}
        colorScheme="indigo"
      />,
    );

    expect(container.querySelector('[data-color-scheme="indigo"]')).not.toBeNull();
  });
});
