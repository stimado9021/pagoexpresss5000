export type Post = {
  slug: string
  title: string
  description: string
  date: string
  readMinutes: number
  category: string
  image: string
  content: Array<{
    heading?: string
    paragraphs: string[]
    list?: string[]
    table?: { head: string[]; rows: string[][] }
  }>
}

export const POSTS: Post[] = [
  {
    slug: 'calcular-intereses-prestamos-diarios',
    title: 'Cómo calcular los intereses de un préstamo diario',
    description:
      'La fórmula para calcular el interés de un préstamo con pago diario, el efecto de la tasa sobre el capital y ejemplos resueltos con cifras en pesos colombianos.',
    date: '2026-10-05',
    readMinutes: 7,
    category: 'Cálculo',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1200',
    content: [
      {
        paragraphs: [
          'Un préstamo diario no se cobra con una fórmula única: el resultado depende de si los intereses se calculan sobre el saldo insoluto o sobre el capital original. Elegir mal la base de cálculo es la causa más común de cobros que no cuadran.',
          'A continuación la forma más usada en Colombia y cómo aplicarla paso a paso.',
        ],
      },
      {
        heading: 'La fórmula base',
        paragraphs: [
          'El interés de un período se calcula siempre sobre el saldo insoluto, es decir, el dinero que todavía te deben:',
        ],
        list: [
          'Interés del período = Saldo insoluto × Tasa diaria × Días del período',
          'Cuota del período = Interés del período + Amortización del capital',
          'Saldo final = Saldo inicial − Capital pagado',
        ],
      },
      {
        heading: 'De la tasa mensual a la tasa diaria',
        paragraphs: [
          'La tasa que se ofrece suele venir en términos efectivo mensual (EA). Para convertirla a diaria no se divide entre 30 de forma simple, porque el interés se capitaliza. La forma más precisa es:',
        ],
        list: [
          'Tasa diaria = (1 + EA)^(1/30) − 1',
          'Ejemplo: EA = 2% mensual da una tasa diaria de 0,0659%',
        ],
      },
      {
        heading: 'Ejemplo: préstamo de pago diario',
        paragraphs: [
          'Préstamo de $500.000 al 2% efectivo mensual, pagadero en 30 cuotas diarias de capital constante e interés sobre saldo.',
        ],
        table: {
          head: ['Concepto', 'Valor'],
          rows: [
            ['Capital', '$500.000'],
            ['Plazo', '30 días'],
            ['Tasa diaria', '0,0659%'],
            ['Cuota diaria promedio', '$17.533'],
            ['Total a cobrar', '$525.999'],
            ['Interés total', '$25.999'],
          ],
        },
      },
      {
        heading: 'Por qué la mora se dispara',
        paragraphs: [
          'Si el cliente deja de pagar durante diez días, el saldo insoluto sigue generando interés diario. Sobre $500.000 son $329 adicionales, y la mora se cobra además como porcentaje sobre el saldo. Un sistema de gestión aplica ambos automáticamente; una calculadora manual casi nunca.',
        ],
      },
      {
        heading: 'Los tres errores más comunes',
        paragraphs: ['Estas son las fallas habituales al calcular a mano:'],
        list: [
          'Calcular el interés sobre el capital original en vez del saldo insoluto, lo que encarece el préstamo para el cliente.',
          'Usar siempre 30 días cuando el mes tiene 28, 29 o 31 días.',
          'Redondear cada cuota a los pesos y arrastrar el error durante todo el préstamo.',
        ],
      },
      {
        heading: 'Qué hace un sistema de gestión',
        paragraphs: [
          'Kreditools aplica la fórmula sobre el saldo real, recalcula mora e interés cada día y reparte el pago entre capital e interés de forma automática. Así el estado de cuenta del cliente siempre cuadra.',
        ],
      },
    ],
  },
  {
    slug: 'reducir-mora-cartera-prestamos',
    title: 'Cómo reducir la mora en tu cartera de préstamos',
    description:
      'La mora no se quita persiguiendo al cliente: se reduce con seguimiento preventivo, acuerdos claros y una estrategia de cobranza por días de atraso.',
    date: '2026-10-07',
    readMinutes: 6,
    category: 'Cobranza',
    image: 'https://images.unsplash.com/photo-1460925895917-afbe65ae836L?auto=format&fit=crop&q=80&w=1200',
    content: [
      {
        paragraphs: [
          'La mora se dispara cuando el cliente se entera tarde de que debe. La mayoría de estrategias fallan porque atacan el síntoma, llamar al que ya debe, en lugar de la causa, no avisar a tiempo al que todavía está al día.',
        ],
      },
      {
        heading: 'Estrategia por días de atraso',
        paragraphs: ['La cobranza funciona mejor clasificada por gravedad y no por antigüedad:'],
        table: {
          head: ['Etapa', 'Días', 'Acción efectiva'],
          rows: [
            ['Preventiva', '0', 'Recordatorio automático un día antes del vencimiento'],
            ['Alerta', '1', 'Aviso por WhatsApp con el saldo y la fecha límite'],
            ['Recuperación', '2 a 7', 'Llamada directa y acuerdo de ajuste de cuota'],
            ['Escalamiento', '8 a 15', 'Notificación formal y bloqueo de nuevos créditos'],
            ['Cobranza', 'más de 15', 'Acuerdo de pago o proceso legal según tu política'],
          ],
        },
      },
      {
        heading: 'El recordatorio preventivo es lo más rentable',
        paragraphs: [
          'La mayoría de los pagos que se atrasan igual se recuperan si el cliente recibe un aviso previo. Ese mensaje es gratuito y automático, por eso un sistema que envía recordatorios por su cuenta reduce más mora que un cobrador que dedica el día a llamar.',
        ],
      },
      {
        heading: 'Los acuerdos de pago',
        paragraphs: [
          'Un cliente en mora que propone un acuerdo y lo cumple vale más que uno al que hay que perseguir sin descanso. Al registrar el acuerdo dentro del sistema conservas la deuda y la evidencia, sin cortar la relación con el cliente.',
        ],
      },
      {
        heading: 'Mide por agente, no por cartera',
        paragraphs: [
          'El dato que más sirve no es el total de mora, sino los días promedio de atraso por agente. Permite identificar quién necesita acompañamiento y quién está presionando más de lo necesario.',
        ],
      },
    ],
  },
  {
    slug: 'software-cobranza-vs-excel',
    title: 'Software de cobranza contra Excel: qué cambia en la práctica',
    description:
      'Comparación honesta entre llevar los préstamos en una hoja de cálculo y usar un sistema de gestión, con los límites reales de Excel y el costo de migrar.',
    date: '2026-10-09',
    readMinutes: 8,
    category: 'Comparativa',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200',
    content: [
      {
        paragraphs: [
          'Excel no está mal. Es gratis y lo dominas. El problema aparece cuando la cartera crece: cada hoja es una oportunidad de error y el cálculo de mora deja de ser confiable.',
        ],
      },
      {
        heading: 'Dónde Excel empieza a fallar',
        paragraphs: ['Los límites reales, sin exagerar:'],
        list: [
          'Un error de fórmula se propaga a cientos de filas sin avisar.',
          'No hay historial: sobrescribes la celda y pierdes el rastro del cambio.',
          'Varias personas editando la misma hoja generan conflictos silenciosos.',
          'No hay alertas, así que nadie te avisa que un cliente lleva cinco días en mora.',
          'Calcular mora e interés sobre saldo a mano consume horas cada semana.',
        ],
      },
      {
        heading: 'Lo que un sistema resuelve de verdad',
        paragraphs: [
          'No se trata de verse más elegante, sino de que los números sean confiables. Un sistema de gestión aplica las fórmulas automáticamente, guarda cada cambio en el historial, separa permisos por rol y genera reportes listos para compartir.',
        ],
      },
      {
        heading: 'El costo de migrar',
        paragraphs: [
          'Migrar no es gratis: hay que limpiar los datos, cargar la cartera y capacitar al equipo durante una semana. Si tienes menos de veinte clientes y no trabajas con agentes, Excel probablemente te alcanza. Si ya manejas agentes, comisiones o más de una sucursal, el costo se paga solo.',
        ],
      },
      {
        heading: 'Cuatro preguntas para decidir',
        paragraphs: ['Responde esto antes de cambiar:'],
        list: [
          '¿Cuánto tiempo dedicas a sumar intereses y detectar la mora a mano?',
          '¿Puedes responder cuánto se debe en total sin revisar cinco archivos?',
          '¿Un agente puede ver por error la cartera de otro agente?',
          '¿Sabes qué cambió en un saldo hace tres meses?',
        ],
      },
    ],
  },
]

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug)
}
