import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Términos del Servicio',
  description:
    'Términos y condiciones del servicio Kreditools: planes, periodo de prueba, pagos, uso aceptable, suspensión y responsabilidades. Léelos antes de registrar tu empresa.',
  alternates: { canonical: '/terminos' },
};

// BORRADOR — requiere revisión de un abogado antes de considerarse definitivo.
// Completa los datos entre corchetes con la información legal de tu empresa.
const datosEmpresa = {
  razonSocial: 'Rafael Enrique Orozco Quintero',
  nit: '1140911464-2',
  correo: 'quinteroenrrique321@gmail.com',
  ciudad: 'Barranquilla, Colombia',
};

const secciones: Array<{ titulo: string; contenido: string[] }> = [
  {
    titulo: '1. Objeto y aceptación',
    contenido: [
      `Los presentes Términos del Servicio regulan el acceso y uso de la plataforma Kreditools, un software como servicio (SaaS) para la gestión de préstamos, clientes, vendedores y cobros, operado por ${datosEmpresa.razonSocial}, con NIT ${datosEmpresa.nit} (${datosEmpresa.ciudad}), en adelante "Kreditools".`,
      'Al registrar una empresa, crear un usuario o usar la plataforma por cualquier medio, aceptas estos Términos en su totalidad. Si no estás de acuerdo, no debes usar el servicio.',
      'Kreditools podrá modificar estos Términos en cualquier momento. Los cambios sustanciales se publicarán en esta página con al menos 15 días de antelación y, cuando sea procedente, se notificarán al correo registrado. El uso continuado del servicio después de la entrada en vigencia implica aceptación.',
    ],
  },
  {
    titulo: '2. Definiciones',
    contenido: [
      '• Empresa o Tenant: cada negocio registrado, con su propio espacio de trabajo (subdominio), usuarios y datos aislados de los demás.',
      '• Empresario: usuario administrador de una Empresa, responsable de su suscripción, sus usuarios y los datos que cargue.',
      '• Vendedor y Cliente: usuarios operativos y deudores gestionados dentro de una Empresa.',
      '• Plan: modalidad de suscripción con precios, límites y vigencias descritos en la sección 4.',
      '• Periodo de prueba: 15 días calendario de uso gratuito descritos en la sección 5.',
    ],
  },
  {
    titulo: '3. Registro y cuentas',
    contenido: [
      'Para usar Kreditools debes registrar tu empresa con información veraz: nombre del negocio, nombre del administrador, correo electrónico válido, teléfono y subdominio elegido.',
      'Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada con tu cuenta. Debes notificar de inmediato cualquier uso no autorizado a ' + datosEmpresa.correo + '.',
      'Cada Empresa es responsable de las cuentas de sus vendedores y de los datos de los clientes que cargue, incluyendo contar con la autorización previa de los titulares para el tratamiento de sus datos personales (ver Política de Tratamiento de Datos).',
      'Queda prohibido: (a) compartir una misma cuenta entre varias personas; (b) registrar empresas con datos falsos; (c) revender o sublicenciar el acceso sin autorización escrita.',
    ],
  },
  {
    titulo: '4. Planes, precios y pagos',
    contenido: [
      'Los planes vigentes son: Independiente USD 39/mes, Empresarial USD 79/mes y Corporativo USD 99/mes, con opción de pago anual equivalente a 10 meses. Los precios se cobran en pesos colombianos (COP) a la tasa de conversión informada al momento del pago e incluyen los impuestos aplicables.',
      'El pago se realiza por adelantado a través de las pasarelas habilitadas (actualmente Wompi: tarjetas, PSE, Nequi y transferencias). Al pagar autorizas el cobro del valor correspondiente a tu plan e intervalo.',
      'La suscripción se renueva automáticamente por periodos iguales hasta su cancelación. Puedes cambiar de plan en cualquier momento desde Facturación; el cambio aplica al siguiente ciclo o de inmediato según lo informado en pantalla.',
      'Salvo lo exigido por la ley aplicable, los pagos realizados no son reembolsables. Si un cobro presenta un error atribuible a Kreditools, lo corregiremos mediante nota crédito o extensión del servicio.',
    ],
  },
  {
    titulo: '5. Periodo de prueba de 15 días',
    contenido: [
      'Toda empresa nueva recibe 15 días calendario de prueba gratuita con las características del plan Independiente, sin tarjeta de crédito.',
      'Durante la prueba puedes registrar vendedores, clientes y préstamos con normalidad. Te avisaremos por correo cuando falten 3 días y al vencimiento.',
      'Al terminar la prueba sin suscripción activa, tu Empresa, tus vendedores y tus clientes quedarán bloqueados hasta que contrates un plan. Tus datos se conservan y se restauran al pagar.',
    ],
  },
  {
    titulo: '6. Suspensión y cancelación',
    contenido: [
      'Kreditools podrá suspender total o parcialmente el servicio a una Empresa cuando: (a) venza el periodo de prueba sin pago; (b) la suscripción paga venza sin renovación (con 7 días de gracia antes de la cancelación definitiva); (c) se incumplan estos Términos o la ley; (d) se detecte fraude, abuso o riesgo para la seguridad de la plataforma.',
      'Puedes cancelar tu suscripción en cualquier momento desde Facturación o escribiendo a ' + datosEmpresa.correo + '. La cancelación rige desde el siguiente ciclo; no hay reembolsos por periodos en curso.',
      'Tras la cancelación definitiva conservaremos tus datos por 90 días para una eventual reactivación; luego podrán eliminarse de forma segura, salvo obligación legal de conservación.',
    ],
  },
  {
    titulo: '7. Uso aceptable',
    contenido: [
      'Te comprometes a usar Kreditools solo para fines lícitos y a no: (a) intentar acceder a datos de otras empresas; (b) vulnerar la seguridad, saturar o interferir con la plataforma; (c) usar el servicio para actividades ilícitas, usura por fuera de los topes legales u hostigamiento en cobros; (d) extraer masivamente contenidos o hacer ingeniería inversa salvo lo permitido por la ley.',
      'Eres el único responsable del cumplimiento de la normativa de crédito, cobranza y protección al consumidor aplicable a tu negocio, incluyendo los topes de interés y las prácticas de cobro permitidas en Colombia.',
    ],
  },
  {
    titulo: '8. Datos personales',
    contenido: [
      'El tratamiento de datos personales se rige por nuestra Política de Tratamiento de Datos Personales, que hace parte integral de estos Términos.',
      'Cada Empresa actúa como responsable de los datos de sus propios clientes y deudores; Kreditools actúa como encargado, procesándolos únicamente para prestar el servicio y siguiendo tus instrucciones.',
    ],
  },
  {
    titulo: '9. Disponibilidad y soporte',
    contenido: [
      'Trabajamos para mantener el servicio disponible de forma continua, pero no garantizamos operación ininterrumpida: podrán existir mantenimientos programados, fallas de terceros (pasarelas de pago, WhatsApp, hosting) o eventos de fuerza mayor.',
      'El soporte se brinda por correo (' + datosEmpresa.correo + ') y WhatsApp en horario laboral. Los planes Empresarial y Corporativo cuentan con soporte prioritario.',
    ],
  },
  {
    titulo: '10. Limitación de responsabilidad',
    contenido: [
      'En la máxima medida permitida por la ley, Kreditools no será responsable por daños indirectos, lucro cesante, pérdida de datos por causas ajenas a su control razonable, ni por decisiones crediticias o de cobranza que tomes con la información de la plataforma.',
      'En todo caso, la responsabilidad total de Kreditools frente a una Empresa no excederá el valor pagado por los 3 últimos meses de suscripción.',
    ],
  },
  {
    titulo: '11. Propiedad intelectual',
    contenido: [
      'Kreditools, su código, diseño, marcas y contenidos son propiedad de ' + datosEmpresa.razonSocial + ' y están protegidos por las normas de derecho de autor y propiedad industrial. Estos Términos solo te otorgan una licencia limitada, no exclusiva e intransferible de uso del servicio mientras tu suscripción (o prueba) esté vigente.',
      'Tus datos y los de tus clientes siguen siendo tuyos. Al terminar el servicio puedes solicitar la exportación o eliminación conforme a la sección 6.',
    ],
  },
  {
    titulo: '12. Ley aplicable y contacto',
    contenido: [
      'Estos Términos se rigen por las leyes de la República de Colombia. Cualquier controversia se someterá a los jueces y autoridades competentes del domicilio de ' + datosEmpresa.razonSocial + '.',
      `Contacto: ${datosEmpresa.correo} — ${datosEmpresa.ciudad}.`,
      'Fecha de entrada en vigencia: septiembre de 2026.',
    ],
  },
];

export default function TerminosPage() {
  return (
    <main className="min-h-screen bg-emerald-950 text-bone">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-lime">Kreditools</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
          Términos del Servicio
        </h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-bone/60">
          Borrador en revisión: este documento requiere validación de un abogado antes de considerarse definitivo.
          Completa los datos de tu empresa donde aparecen corchetes.
        </p>

        <div className="mt-10 space-y-10">
          {secciones.map((s) => (
            <section key={s.titulo}>
              <h2 className="font-display text-xl font-semibold text-lime">{s.titulo}</h2>
              <div className="mt-3 space-y-3">
                {s.contenido.map((p, i) => (
                  <p key={i} className="font-body text-sm leading-relaxed text-bone/70">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 font-body text-sm text-bone/60">
          ¿Dudas? Escríbenos a {datosEmpresa.correo}. Ver también nuestra{' '}
          <Link href="/politica-de-datos" className="text-lime hover:underline">
            Política de Tratamiento de Datos
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
