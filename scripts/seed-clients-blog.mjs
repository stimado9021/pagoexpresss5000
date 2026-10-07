import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ARTICULOS_EXTRA = [
  {
    titulo: 'Transparencia total: La cuenta del cliente en Kreditools',
    slug: 'cuenta-cliente-transparencia-total',
    resumen: 'Elimina las discusiones con tus clientes. Ahora ellos pueden ver su saldo y pagos en tiempo real desde su propio acceso.',
    contenido: `Uno de los mayores fricciones en el negocio de los préstamos es la desconfianza. El cliente a menudo duda de cuánto ha pagado o cuánto le falta por pagar, lo que genera discusiones y tensiones.

Kreditools soluciona esto mediante la creación de cuentas individuales para cada cliente. Ahora, el cliente no tiene que llamar al vendedor o esperar a que el administrador revise la base de datos; simplemente ingresa a su portal personal.

En su cuenta, el cliente puede ver:
1. El monto total de su préstamo.
2. La lista detallada de cada pago realizado y la fecha exacta.
3. El saldo pendiente actualizado al segundo.
4. La fecha de su próximo pago.

Esta transparencia no solo reduce las llamadas de soporte, sino que aumenta la confianza del cliente en tu negocio, haciéndote ver como una entidad financiera profesional y no como un prestamista informal. Cuando el cliente ve sus datos claros, se siente más comprometido a pagar a tiempo.`,
    imagenUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Autogestión: El futuro de la cobranza digital',
    slug: 'autogestion-cobranza-digital',
    resumen: 'Dale el poder al cliente y reduce tu carga operativa. Descubre cómo el acceso digital mejora la tasa de recuperación.',
    contenido: `El modelo tradicional de cobranza depende 100% del vendedor que visita al cliente. Pero, ¿qué pasa cuando el vendedor se enferma o el cliente no está en casa?

Kreditools introduce la autogestión. Al proporcionar una cuenta al cliente, el proceso de cobranza se vuelve híbrido. El cliente puede recordar su deuda y planificar su pago sin necesidad de que alguien toque su puerta.

Este enfoque reduce la carga operativa del administrador. Ya no tienes que generar estados de cuenta manuales ni enviar capturas de pantalla por WhatsApp. Todo está automatizado en el portal del cliente.

La autogestión fomenta la responsabilidad. El cliente, al ver su progreso en la barra de pagos, siente la satisfacción de ver cómo su deuda disminuye, lo que psicológicamente lo motiva a liquidar el préstamo más rápido.`,
    imagenUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=800',
  },
  {
    titulo: 'Cómo evitar la mora mediante la visibilidad del cliente',
    slug: 'evitar-mora-visibilidad-cliente',
    resumen: 'La mora ocurre cuando el cliente "olvida" la fecha. Kreditools elimina el olvido permitiendo que el cliente vigile su propio crédito.',
    contenido: `La frase "se me olvidó que hoy tocaba el pago" es la excusa más común en la cobranza. Para combatir esto, la visibilidad es la mejor herramienta.

Cuando el cliente tiene acceso a su cuenta en Kreditools, el préstamo deja de ser un "secreto" manejado solo por el vendedor y se convierte en un compromiso visible. El cliente puede entrar desde su celular en cualquier momento y ver que hoy es día de pago.

Además, esta visibilidad actúa como un recordatorio constante. Ver el saldo pendiente en rojo o ver que faltan pocos pagos para terminar el crédito genera un sentido de urgencia y logro.

Al integrar la cuenta del cliente, Kreditools transforma la relación prestamista-cliente. Ya no es una relación de persecución, sino una de servicio financiero profesional, donde la información fluye libremente y los pagos ocurren sin fricciones.`,
    imagenUrl: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&q=80&w=800',
  },
]

async function main() {
  console.log('Añadiendo artículos sobre cuentas de clientes...')
  
  for (const art of ARTICULOS_EXTRA) {
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
  }
  console.log('Artículos añadidos exitosamente.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
