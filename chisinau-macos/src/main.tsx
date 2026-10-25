import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CityGame from '../app/city-game';
import '../app/globals.css';

document.documentElement.lang = 'ro';

const root = document.getElementById('root');
if (!root) throw new Error('Nu s-a găsit suprafața jocului.');

createRoot(root).render(
  <StrictMode>
    <CityGame />
  </StrictMode>,
);
