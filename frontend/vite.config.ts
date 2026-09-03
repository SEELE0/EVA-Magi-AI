import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        decisionConsoleLab: 'design_test/decision-console-lab.html',
        magiBootTest: 'design_test/magi-boot-test.html',
        nervLogoAnimeTest: 'design_test/nerv-logo-anime-test.html',
        biosStartTest: 'design_test/bios-start-test.html',
        evaWaveformTest: 'design_test/eva-waveform-test.html',
        decisionHomeAnimeOriginal: 'decision-home-anime-original.html'
      }
    }
  },
  test: {
    environment: 'node'
  }
});
