import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const ARTICULOS = [
  {
    titulo: 'Por qué abandonar el cuaderno en la gestión de préstamos',
    slug: 'abandonar-cuaderno-gestion-prestamos',
    resumen: 'El riesgo de perder datos y errores de cálculo es altísimo en el método tradicional. Descubre cómo la digitalización salva tu negocio.',
    contenido: `La gestión de préstamos mediante cuadernos ha sido la norma durante décadas, pero en el mundo actual, este método es una bomba de tiempo. Perder el cuaderno, un error de suma o una página manchada puede significar la pérdida de miles de pesos.\n\nKreditools nace para eliminar este riesgo. Al digitalizar tu cartera, tienes un respaldo en la nube accesible desde cualquier lugar. Ya no dependes de un libro físico que puede desaparecer.\n\nLa ventaja competitiva de Kreditools sobre otros sistemas es su simplicidad. Mientras que los softwares bancarios son complejos y lentos de aprender, Kreditools se siente natural. Creas un préstamo en segundos y el sistema calcula automáticamente la cuota diaria, los intereses y la fecha de finalización.\n\nSi quieres escalar tu negocio, el primer paso es dejar el papel y pasar a la nube.`,
    imagenUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Cómo optimizar el cobro diario con agentes de campo',
    slug: 'optimizar-cobro-diario-agentes-campo',
    resumen: 'El éxito de un negocio de crédito rápido está en la eficiencia del cobro. Aprende a gestionar tus vendedores sin estrés.',
    contenido: `Tener vendedores en la calle es la mejor forma de recuperar el capital, pero el caos comienza cuando no sabes cuánto ha cobrado cada uno en tiempo real.\n\nKreditools resuelve esto integrando una gestión de usuarios por roles. Cada vendedor tiene acceso solo a sus clientes asignados, evitando fugas de información y organizando la ruta de cobro.\n\nA diferencia de los sistemas genéricos, Kreditools permite al administrador ver exactamente cuánto dinero debe ingresar cada día y quién es el responsable de cada cobro. Esto reduce drásticamente la posibilidad de errores humanos o fraudes internos.\n\nLa eficiencia en el campo se traduce en mayor flujo de caja. Con Kreditools, el control es total y la visibilidad es inmediata.`,
    imagenUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'La importancia del cálculo exacto de intereses en microcréditos',
    slug: 'importancia-calculo-exacto-intereses',
    resumen: 'Un error del 1% en el cálculo de intereses puede costar millones al final del año. Aprende a automatizar tus tasas.',
    contenido: `En el mundo de los microcréditos, la precisión es todo. Un cálculo manual erróneo no solo afecta tus ganancias, sino que daña la confianza del cliente.\n\nKreditools implementa un motor de cálculo preciso donde defines la tasa de interés y el plazo, y el sistema genera el plan de pagos exacto. Ya no hay espacio para la duda: el cliente sabe cuánto paga y tú sabes cuánto ganas.\n\nMientras que otros sistemas obligan al usuario a hacer cálculos externos y luego ingresarlos, Kreditools lo hace todo internamente. Desde el monto solicitado hasta el saldo pendiente, cada centavo está contabilizado.\n\nLa transparencia es la base de la fidelidad del cliente. Al usar Kreditools, proyectas una imagen de profesionalismo que te permite cobrar tasas justas y mantener una cartera saludable.`,
    imagenUrl: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Cómo reducir la mora en préstamos rápidos',
    slug: 'reducir-mora-prestamos-rapidos',
    resumen: 'La mora es el cáncer de cualquier negocio de crédito. Aquí te enseñamos estrategias para mantener tu cartera al día.',
    contenido: `El mayor reto de cualquier prestamista es la mora. Cuando los pagos se retrasan, el flujo de caja se detiene y el riesgo aumenta.\n\nLa clave para reducir la mora es la visibilidad. Kreditools te muestra en tiempo real qué clientes tienen días de atraso, permitiéndote actuar antes de que la deuda sea irrecuperable.\n\nLa ventaja de Kreditools es su capacidad de segmentación. Puedes identificar rápidamente a los clientes "problemáticos" y ajustar las estrategias de cobro para cada caso. Además, al tener la información digitalizada, puedes enviar recordatorios precisos y profesionales.\n\nUn sistema organizado es un sistema que cobra. Al automatizar el seguimiento, liberas tiempo para buscar nuevos clientes mientras el software vigila tu dinero.`,
    imagenUrl: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'SaaS vs Software Local: ¿Cuál es mejor para tu empresa de crédito?',
    slug: 'saas-vs-software-local-gestion-prestamos',
    resumen: 'Instalar un programa en una PC ya es cosa del pasado. Descubre por qué la nube es el futuro de las finanzas.',
    contenido: `Muchos prestamistas aún usan softwares que se instalan en una sola computadora. El problema es obvio: si la PC falla o se roba, el negocio muere.\n\nKreditools es un SaaS (Software as a Service). Esto significa que tu información vive en la nube, protegida y disponible desde cualquier dispositivo con internet. Puedes revisar tu cartera desde tu celular mientras estás en el banco o desde tu laptop en casa.\n\nA diferencia del software local, Kreditools se actualiza automáticamente. No tienes que pagar por versiones nuevas ni hacer instalaciones tediosas. Simplemente entras, haces login y todo está al día.\n\nLa movilidad es la nueva moneda del éxito. No encadenes tu negocio a una oficina; llévalo contigo donde quiera que vayas gracias a la arquitectura en la nube de Kreditools.`,
    imagenUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Guía para iniciar un negocio de microcréditos exitoso',
    slug: 'guia-iniciar-negocio-microcreditos',
    resumen: 'Emprender en el sector financiero requiere orden y estrategia. Te damos la hoja de ruta para empezar con el pie derecho.',
    contenido: `Iniciar un negocio de préstamos es lucrativo, pero peligroso si no hay orden. El primer error de muchos emprendedores es empezar a prestar sin un sistema de registro.\n\nPara tener éxito, necesitas tres cosas: capital, clientes confiables y un sistema de control. Kreditools es el tercer pilar. Te permite registrar cada centavo, gestionar el riesgo y medir la rentabilidad de tu capital desde el día uno.\n\nLa diferencia entre un prestamista amateur y un profesional es la tecnología que utiliza. Mientras el amateur lucha con papeles, el profesional usa Kreditools para optimizar sus procesos y escalar su operación.\n\nEmpieza pequeño, pero piensa en grande. Utiliza herramientas profesionales desde el inicio para que tu crecimiento sea sostenible y libre de errores.`,
    imagenUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Transparencia total: La cuenta del cliente en Kreditools',
    slug: 'cuenta-cliente-transparencia-total',
    resumen: 'Elimina las discusiones con tus clientes. Ahora ellos pueden ver su saldo y pagos en tiempo real desde su propio acceso.',
    contenido: `Uno de los mayores fricciones en el negocio de los préstamos es la desconfianza. El cliente a menudo duda de cuánto ha pagCado o cuánto le falta por pagar, lo que genera discusiones y tensiones.\n\nKreditools soluciona esto mediante la creación de cuentas individuales para cada cliente. Ahora, el cliente no tiene que llamar al vendedor o esperar a que el administrador revise la base de datos; simplemente ingresa a su portal personal.\n\nEn su cuenta, el cliente puede ver:\n1. El monto total de su préstamo.\n2. La lista detallada de cada pago realizado y la fecha exacta.\n3. El saldo pendiente actualizado al segundo.\n4. La fecha de su próximo pago.\n\nEsta transparencia no solo reduce las llamadas de soporte, sino que aumenta la confianza del cliente en tu negocio, haciéndote ver como una entidad financiera profesional y no como un prestamista informal. Cuando el cliente ve sus datos claros, se siente más comprometido a pagar a tiempo.`,
    imagenUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Autogestión: El futuro de la cobranza digital',
    slug: 'autogestion-cobranza-digital',
    resumen: 'Dale el poder al cliente y reduce tu carga operativa. Descubre cómo el acceso digital mejora la tasa de recuperación.',
    contenido: `El modelo tradicional de cobranza depende 100% del vendedor que visita al cliente. Pero, ¿qué pasa cuando el vendedor se enferma o el cliente no está en casa?\n\nKreditools introduce la autogestión. Al proporcionar una cuenta al cliente, el proceso de cobranza se vuelve híbrido. El cliente puede recordar su deuda y planificar su pago sin necesidad de que alguien toque su puerta.\n\nEste enfoque reduce la carga operativa del administrador. Ya no tienes que generar estados de cuenta manuales ni enviar capturas de pantalla por WhatsApp. Todo está automatizado en el portal del cliente.\n\nLa autogestión fomenta la responsabilidad. El cliente, al ver su progreso en la barra de pagos, siente la satisfacción de ver cómo su deuda disminuye, lo que psicológicamente lo motiva a liquidar el préstamo más rápido.`,
    imagenUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Cómo evitar la mora mediante la visibilidad del cliente',
    slug: 'evitar-mora-visibilidad-cliente',
    resumen: 'La mora ocurre cuando el cliente "olvida" la fecha. Kreditools elimina el olvido permitiendo que el cliente vigile su propio crédito.',
    contenido: `La frase "se me olvidó que hoy tocaba el pago" es la excusa más común en la cobranza. Para combatir esto, la visibilidad es la mejor herramienta.\n\nCuando el cliente tiene acceso a su cuenta en Kreditools, el préstamo deja de ser un "secreto" manejCado solo por el vendedor y se convierte en un compromiso visible. El cliente puede entrar desde su celular en cualquier momento y ver que hoy es día de pago.\n\nAdemás, esta visibilidad actúa como un recordatorio constante. Ver el saldo pendiente en rojo o ver que faltan pocos pagos para terminar el crédito genera un sentido de urgencia y logro.\n\nAl integrar la cuenta del cliente, Kreditools transforma la relación prestamista-cliente. Ya no es una relación de persecución, sino una de servicio financiero profesional, donde la información fluye libremente y los pagos ocurren sin fricciones.`,
    imagenUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&q=80&w=800',
  },
]

export async function GET() {
  const session = await getSession()
  if (!session || session.rol !== 'superadmin') {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 403 })
  }

  try {
    let createdCount = 0
    for (const art of ARTICULOS) {
      await prisma.articulo.upsert({
        where: { slug: art.slug },
        update: {},
        create: {
          titulo: art.titulo,
          slug: art.slug,
          resumen: art.resumen,
          contenido: art.contenido,
          imagenUrl: art.imagenUrl,
        },
      })
      createdCount++
    }

    return NextResponse.json({ 
      success: true, 
      message: `Blog poblado exitosamente. Se procesaron ${createdCount} artículos.` 
    })
  } catch (error) {
    console.error('Seed blog error:', error)
    return NextResponse.json({ success: false, message: 'Error al poblar el blog' }, { status: 500 })
  }
}
