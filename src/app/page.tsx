import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'PagoExpress — Software para gestión de préstamos personales y a través de terceros',
  description: 'PagoExpress es el sistema integral para prestamistas y empresas de crédito: cobros, agentes, intereses y reportes en un solo lugar.',
};

export default function Home() {
  return <LandingPage />;
}

