import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Tratamiento de Datos Personales',
  description:
    'Política de tratamiento de datos personales de Kredipay, conforme a la Ley 1581 de 2012 y su normativa reglamentaria en Colombia. Conoce qué datos recopilamos, para qué los usamos y cómo ejercer tus derechos.',
  alternates: { canonical: '/politica-de-datos' },
};

const datosResponsable = {
  empresa: '[Razón social de la empresa]',
  nit: '[NIT 000.000.000-0]',
  direccion: '[Dirección de domicilio]',
  ciudad: '[Ciudad, Colombia]',
  correo: '[correo@tuempresa.com]',
  telefono: '[Teléfono de contacto]',
};

const secciones: Array<{ titulo: string; contenido: string[] }> = [
  {
    titulo: '1. Responsable del tratamiento',
    contenido: [
      `El responsable del tratamiento de los datos personales es ${datosResponsable.empresa}, con NIT ${datosResponsable.nit}, domicilio en ${datosResponsable.direccion}, ${datosResponsable.ciudad}, correo electrónico ${datosResponsable.correo} y teléfono ${datosResponsable.telefono}.`,
      `En esta política se describen los datos personales que Kredipay recopila, las finalidades de su tratamiento, los derechos que asisten a los titulares y el procedimiento para ejercerlos, en cumplimiento de lo dispuesto por la Ley 1581 de 2012, el Decreto 1377 de 2013 y las demás normas que los modifiquen o complementen.`,
    ],
  },
  {
    titulo: '2. Normatividad aplicable',
    contenido: [
      'La presente política se rige por la normativa colombiana de protección de datos personales, en particular:',
      '• La Ley 1581 de 2012, por la cual se dictan disposiciones generales para la protección de datos personales.',
      '• El Decreto 1377 de 2013, reglamentario de la Ley 1581 de 2012.',
      '• El Decreto 1074 de 2015, que compila la reglamentación en materia de protección de datos personales.',
      '• La Sentencia C-748 de 2011 de la Corte Constitucional y la doctrina de la Superintendencia de Industria y Comercio (SIC), autoridad de vigilancia en la materia.',
    ],
  },
  {
    titulo: '3. Definiciones',
    contenido: [
      'Para efectos de esta política se entenderá por:',
      '• Datos personales: cualquier información vinculada o que pueda asociarse a una o varias personas naturales determinadas o determinables.',
      '• Dato sensible: aquel que afecta la intimidad del titular o cuyo uso indebido puede generar discriminación, como el origen racial o étnico, orientación política, convicciones religiosas o filosóficas, pertenencia a sindicatos, datos de salud, datos biométricos y la vida sexual.',
      '• Titular: la persona natural cuyos datos personales son objeto de tratamiento.',
      '• Tratamiento: cualquier operación o conjunto de operaciones sobre datos personales, como la recolección, almacenamiento, uso, circulación, supresión, actualización y disposición.',
      '• Autorización: consentimiento previo, expreso e informado del titular para llevar a cabo el tratamiento de sus datos.',
    ],
  },
  {
    titulo: '4. Datos personales que recopilamos',
    contenido: [
      'Datos de las personas naturales que se registran en Kredipay (empresarios, administradores, vendedores y demás usuarios de la plataforma):',
      '• Nombres y apellidos, número de cédula, correo electrónico, teléfono y dirección.',
      '• Nombre de la empresa o negocio, subdominio elegido y credenciales de acceso (usuario y contraseña cifrada).',
      '• Información de facturación y suscripción, así como el historial de pagos y planes contratados.',
      'Datos de los clientes y deudores que los usuarios cargan en la plataforma para la gestión de sus préstamos y cobros (como mínimo, los siguientes):',
      '• Nombres y apellidos, número de cédula, teléfono y dirección.',
      '• Datos financieros propios de la operación de crédito: montos solicitados, tasas de interés, cuotas, saldos, fechas de pago, días de atraso e historial de pagos.',
      'La información de clientes y deudores es suministrada por cada usuario de la plataforma, quien se obliga a contar con la autorización previa de los titulares para su tratamiento. Kredipay la procesa únicamente como encargado del tratamiento, en los términos del numeral 8.',
    ],
  },
  {
    titulo: '5. Finalidades del tratamiento',
    contenido: [
      'Los datos personales recopilados serán tratados para las siguientes finalidades:',
      '• Crear la cuenta, autenticar usuarios y gestionar el acceso a la plataforma conforme al rol asignado (empresario, vendedor o cliente).',
      '• Prestar el servicio de gestión de préstamos: registro de clientes, cálculo de cuotas e intereses, control de pagos, mora y cobros, y generación de reportes.',
      '• Enviar notificaciones de cobro y recordatorios de pago por los canales autorizados (correo electrónico y WhatsApp).',
      '• Facturar y cobrar el plan de suscripción contratado a través de las pasarelas de pago integradas.',
      '• Enviar comunicaciones de soporte, información comercial, novedades y mejoras del servicio, cuando el titular lo haya autorizado o exista interés legítimo.',
      '• Garantizar la seguridad de la información, prevenir el fraude y cumplir obligaciones legales y regulatorias.',
      'En caso de que se requiera el tratamiento de datos sensibles o de menores de edad, se solicitará la autorización expresa y previa del titular o de su representante legal, conforme a la ley.',
    ],
  },
  {
    titulo: '6. Derechos de los titulares',
    contenido: [
      'De conformidad con la Ley 1581 de 2012, los titulares de los datos personales tienen los siguientes derechos:',
      '• Conocer, actualizar y rectificar sus datos personales frente a los responsables o encargados del tratamiento.',
      '• Solicitar prueba de la autorización otorgada, salvo que la ley exima de su exigencia.',
      '• Ser informado, previa solicitud, respecto del uso que se les ha dado a sus datos.',
      '• Presentar quejas ante la Superintendencia de Industria y Comercio por infracciones a la ley.',
      '• Revocar la autorización y/o solicitar la supresión de los datos cuando no se respeten los principios, derechos y garantías constitucionales y legales.',
      '• Acceder en forma gratuita a sus datos personales que hayan sido objeto de tratamiento.',
    ],
  },
  {
    titulo: '7. Deberes del responsable del tratamiento',
    contenido: [
      `Kredipay, a través de ${datosResponsable.empresa}, se obliga a cumplir los siguientes deberes:`,
      '• Garantizar al titular, en todo tiempo, el pleno y efectivo ejercicio del derecho de hábeas data.',
      '• Solicitar y conservar la autorización para el tratamiento de los datos, en los términos de la ley.',
      '• Informar debidamente al titular sobre la finalidad de la recolección de sus datos.',
      '• Conservar la información bajo las condiciones de seguridad necesarias para impedir su adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento.',
      '• Rectificar la información cuando sea incorrecta y comunicar las novedades respectivas.',
      '• Tramitar las consultas y reclamos formulados por los titulares en los términos y plazos legales.',
      '• Abstenerse de circular información que contravenga la ley o las disposiciones de la presente política.',
    ],
  },
  {
    titulo: '8. Tratamiento de datos de terceros (clientes y deudores)',
    contenido: [
      'Kredipay es una plataforma de software como servicio (SaaS). Cada usuario de la plataforma (empresario o prestamista) es el responsable del tratamiento de los datos personales de sus propios clientes y deudores, y Kredipay actúa como encargado del tratamiento respecto de esos datos.',
      'En consecuencia:',
      '• El usuario responde por obtener la autorización de sus clientes y deudores, informándoles las finalidades de la gestión de su crédito y cobros.',
      '• Kredipay procesará los datos de los clientes y deudores únicamente para la prestación del servicio contratado y siguiendo las instrucciones del responsable.',
      '• El usuario podrá descargar o eliminar la información de su espacio, según el plan contratado, y deberá gestionar la supresión de datos de acuerdo con la ley y los términos del servicio.',
    ],
  },
  {
    titulo: '9. Transferencia y transmisión internacional de datos',
    contenido: [
      'Para la prestación del servicio, algunos datos pueden ser almacenados o procesados por proveedores de infraestructura y servicios ubicados dentro o fuera de Colombia, entre ellos:',
      '• Proveedor de base de datos en la nube (hosting) para el almacenamiento de la información.',
      '• Proveedor de mensajería instantánea (WhatsApp) para el envío de comprobantes y recordatorios de pago.',
      '• Pasarelas de pago (Stripe y/o Wompi) para el procesamiento de las transacciones de suscripción.',
      'Estos proveedores actúan como encargados del tratamiento y se encuentran sujetos a cláusulas contractuales de confidencialidad y seguridad. Cualquier transmisión internacional de datos se realizará conforme a la Ley 1581 de 2012 y a las normas que la reglamenten.',
    ],
  },
  {
    titulo: '10. Medidas de seguridad de la información',
    contenido: [
      'Kredipay adopta las siguientes medidas técnicas, humanas y administrativas para proteger los datos personales:',
      '• Cifrado de la información en tránsito (TLS) y almacenamiento de contraseñas mediante algoritmos seguros (hash).',
      '• Control de acceso por roles (empresario, vendedor, cliente) para garantizar que cada usuario solo acceda a la información autorizada.',
      '• Registro de auditoría (historial) de las operaciones relevantes realizadas en la plataforma.',
      '• Respaldos automáticos de la base de datos.',
      '• Políticas internas de confidencialidad y uso de la información para el equipo de trabajo y proveedores.',
    ],
  },
  {
    titulo: '11. Procedimiento para ejercer los derechos de los titulares',
    contenido: [
      `El titular o su representante puede ejercer sus derechos de consulta, actualización, rectificación, supresión y revocación de la autorización, enviando una solicitud escrita al correo ${datosResponsable.correo}, indicando:`,
      '• Nombre y apellidos del titular, y medio de contacto.',
      '• Documento de identidad (o autorización expresa si actúa un representante).',
      '• Descripción clara y precisa de la solicitud y los datos sobre los cuales recae.',
      'Las consultas serán atendidas dentro de los diez (10) días hábiles siguientes a su recepción. Los reclamos serán respondidos dentro de los quince (15) días hábiles, prorrogables por ocho (8) días hábiles adicionales cuando la naturaleza del reclamo lo exija, de conformidad con la ley.',
    ],
  },
  {
    titulo: '12. Vigencia de los datos y de la política',
    contenido: [
      'Los datos personales serán conservados mientras sean necesarios para las finalidades descritas en esta política, durante la vigencia de la relación contractual con el usuario y, posteriormente, durante los plazos exigidos por la ley para efectos contables, fiscales o legales. Una vez cumplidas las finalidades, los datos serán suprimidos o anonimizados.',
      'Esta política podrá ser actualizada o modificada por Kredipay. Las modificaciones sustanciales serán publicadas en este sitio y, cuando sea procedente, notificadas a los titulares por los canales disponibles antes de su entrada en vigencia.',
    ],
  },
  {
    titulo: '13. Aceptación',
    contenido: [
      'El registro y uso de la plataforma Kredipay implica la aceptación expresa e informada de la presente Política de Tratamiento de Datos Personales, así como de los Términos y Condiciones del servicio.',
    ],
  },
];

export default function PoliticaDeDatosPage() {
  return (
    <main className="min-h-screen bg-emerald-950 text-bone">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <p className="font-mono text-xs uppercase tracking-widest text-lime">Kredipay</p>
        <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">
          Política de Tratamiento de Datos Personales
        </h1>
        <p className="mt-4 font-body text-sm leading-relaxed text-bone/60">
          Fecha de entrada en vigencia: agosto de 2026. De conformidad con la Ley 1581 de 2012 y su normativa reglamentaria.
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
      </div>
    </main>
  );
}
