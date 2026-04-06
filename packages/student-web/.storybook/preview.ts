/**
 * 文件说明：Storybook 全局预览配置。
 */
import type { Preview } from '@storybook/react-vite';

import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    layout: 'fullscreen'
  }
};

export default preview;
