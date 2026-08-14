import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        decisionConsoleLab: 'decision-console-lab.html',
        magiBootTest: 'magi-boot-test.html',
        nervLogoAnimeTest: 'nerv-logo-anime-test.html',
        biosStartTest: 'bios-start-test.html'
      }
    }
  },
  test: {
    environment: 'node'
  }
});
