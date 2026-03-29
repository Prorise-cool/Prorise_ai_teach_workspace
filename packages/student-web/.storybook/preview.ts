import { definePreview } from '@storybook/react-vite';

import '../src/styles/globals.css';

const preview = definePreview({
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
});

export default preview;
