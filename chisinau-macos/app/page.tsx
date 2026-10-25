import type { Metadata } from 'next';
import CityGame from './city-game';

export const metadata: Metadata = {
  title: 'Chișinău · Streets GL',
  description: 'Plimbă-te și condu în Chișinău pe lumea 3D Streets GL, cu mini-hartă care urmărește poziția ta.',
};

export default function Home() { return <CityGame />; }
