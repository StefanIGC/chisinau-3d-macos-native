import type { Metadata } from 'next';
import CityGame from '../city-game';

export const metadata: Metadata = {
  title: 'Chișinău · Joc 3D',
  description: 'Plimbare pe jos și cu mașina în centrul Chișinăului.',
};

export default function GamePage() {
  return <CityGame />;
}
