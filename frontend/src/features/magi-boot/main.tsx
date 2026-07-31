import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import MagiBootTest from './MagiBootTest';
import './magi-boot.css';

createRoot(document.getElementById('magi-boot-test-root')!).render(
  <StrictMode>
    <MagiBootTest />
  </StrictMode>
);
