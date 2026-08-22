import type { Metadata } from 'next';
import LandingPage from '@/components/LandingPage';

export const metadata: Metadata = {
  title: 'Software para prestamistas y gestión de préstamos',
  description: 'Kredipay es el sistema integral para prestamistas y empresas de crédito: cobros, agentes, intereses y reportes en un solo lugar.',
};

const faqData = [
  {
    question: '¿Para quién es Kredipay?',
    answer: 'Kredipay está diseñado para prestamistas, empresas de crédito, cooperativas y negocios de cobranza que quieren dejar las libretas y las hojas de cálculo.',
  },
  {
    question: '¿Puedo manejar préstamos con pago diario?',
    answer: 'Sí. Configura préstamos con pago diario, semanal o mensual, y el sistema calcula automáticamente la cuota, los intereses y el saldo.',
  },
  {
    question: '¿Cómo controlo la mora de mis clientes?',
    answer: 'Kredipay marca automáticamente los días de atraso de cada préstamo y te muestra en el dashboard quién debe, cuánto y desde cuándo.',
  },
  {
    question: '¿Puedo asignar carteras a vendedores o agentes?',
    answer: 'Sí. Cada vendedor tiene su propio usuario con acceso solo a los clientes y préstamos que le asignes.',
  },
  {
    question: '¿Necesito instalar algún programa?',
    answer: 'No. Kredipay funciona 100% en el navegador desde tu celular, tablet o computador.',
  },
  {
    question: '¿Mis datos están seguros?',
    answer: 'Sí. La información viaja con cifrado de extremo a extremo, se respalda automáticamente y el acceso está controlado por rol.',
  },
  {
    question: '¿Cuánto cuesta y hay prueba gratis?',
    answer: 'Puedes probar Kredipay 14 días gratis sin tarjeta de crédito. Los planes comienzan desde $39.000/mes.',
  },
];

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqData.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          }),
        }}
      />
      <LandingPage />
    </>
  );
}

