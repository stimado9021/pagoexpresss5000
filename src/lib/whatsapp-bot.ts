type Intent = {
  keywords: string[]
  response: string
}

const SITE_URL = 'https://kredipay.vercel.app'

const WELCOME = `¡Hola! 👋 Bienvenido a *Kredipay*.

Soy el asistente virtual de la plataforma. Puedo ayudarte con:

1️⃣ 📦 Planes y precios
2️⃣ 💳 Cómo pagar tu plan
3️⃣ 📋 Cómo funcionan los préstamos
4️⃣ 👥 Cómo crear vendedores
5️⃣ 🧑 Cómo crear clientes
6️⃣ 🏢 Cómo crear tu empresa

Escribe el número de la opción o tu pregunta. También puedes visitar 🌐 ${SITE_URL}`

const INTRO = `🌟 *¿Qué es Kredipay?*

Kredipay es una plataforma para prestamistas y empresas de crédito que te ayuda a administrar préstamos, clientes y equipo de cobro en un solo lugar.

Con Kredipay puedes:
• Crear tu empresa con su propio subdominio.
• Administrar vendedores y clientes.
• Registrar préstamos con interés y cuotas diarias.
• Enviar comprobantes y recordatorios por WhatsApp automáticamente.
• Controlar todo desde tu dashboard.

Todo comienza con 15 días de prueba gratis. ¿Quieres conocer los planes? Responde: 1`

const PLANES = `📦 *Planes de Kredipay*

1️⃣ *Independiente* — US$39/mes (US$390/año)
• Hasta 2 vendedores
• Hasta 4 clientes
• Préstamos ilimitados

2️⃣ *Empresarial* — US$99/mes (US$990/año)
• Hasta 15 vendedores
• Hasta 1.500 clientes
• Reportes avanzados
• Marca personalizada

3️⃣ *Corporativo* — US$249/mes (US$2.490/año)
• Vendedores y clientes ilimitados
• Reportes avanzados
• Acceso a API
• Marca personalizada

✅ Los 3 planes incluyen *15 días de prueba gratis*.

¿Quieres saber cómo pagar tu plan o cómo crear tu empresa?`

const PAGAR_PLAN = `💳 *¿Cómo pagar tu plan?*

1. Ingresa al dashboard de tu empresa (tu subdominio, p. ej. miempresa.kredipay.vercel.app) con tu cuenta de empresario.
2. Entra a *Suscripción* en el menú lateral.
3. Elige tu plan y la frecuencia (mensual o anual).
4. Selecciona tu método de pago: tarjeta de crédito o débito (vía Wompi o Stripe).
5. ¡Listo! Tu suscripción se activa de inmediato.

¿Necesitas ayuda con otra cosa? Responde con el número de una opción del menú.`

const PRESTAMOS = `📋 *¿Cómo funcionan los préstamos en Kredipay?*

• El empresario configura la tasa de interés de su empresa (por defecto 20%).
• El vendedor registra el préstamo indicando el monto y el plazo en días.
• El sistema calcula automáticamente el interés total, la cuota diaria y el total a pagar.
• El vendedor cobra la cuota cada día y registra el pago en la app.
• El cliente recibe su comprobante por WhatsApp al instante.
• Si hay atraso en los pagos, se envían recordatorios automáticos.

¿Quieres saber cómo crear vendedores o clientes?`

const VENDEDORES = `👥 *¿Cómo crear vendedores?*

1. Ingresa con tu cuenta de empresario al dashboard de tu empresa.
2. Ve a la sección *Vendedores* en el menú lateral.
3. Pulsa *"Crear nuevo vendedor"*.
4. Completa sus datos: nombre, cédula, teléfono y contraseña.
5. Guarda y listo: el vendedor ya puede entrar con su cédula y administrar sus clientes y préstamos.

¿Necesitas más información? Responde con el número de una opción del menú.`

const CLIENTES = `🧑 *¿Cómo crear clientes?*

1. El vendedor entra a su cuenta.
2. Va a la sección *Clientes*.
3. Pulsa *"Nuevo cliente"*.
4. Registra: cédula, nombre, teléfono, email y dirección.
5. Guarda y el cliente queda disponible para crear préstamos.

El empresario también puede ver los clientes de cada vendedor desde su dashboard.

¿Quieres saber cómo funcionan los préstamos? Responde: 3`

const EMPRESA = `🏢 *¿Cómo crear tu empresa en Kredipay?*

1. Entra a ${SITE_URL} y pulsa *Registrarme*.
2. Completa el formulario: nombre de la empresa, nombre del administrador, correo, subdominio y contraseña.
3. Tu subdominio quedará así: *tuempresa.kredipay.vercel.app*.
4. Al registrarte empiezas en el plan *Independiente* con *15 días de prueba gratis*.
5. Ingresa a tu subdominio con tu correo o cédula y comienza a trabajar.

¿Quieres conocer los planes? Responde: 1`

const PRUEBA = `🎁 *Prueba gratis de 15 días*

Todos los planes de Kredipay incluyen *15 días de prueba gratis*.

Al crear tu empresa empiezas automáticamente en el plan Independiente sin costo durante los primeros 15 días. Después puedes elegir el plan que mejor se ajuste a tu negocio.

¿Quieres conocer los planes? Responde: 1`

const CONTACTO = `📞 *Contacto*

Si necesitas ayuda personalizada, visita nuestra web o escríbenos:
🌐 ${SITE_URL}

Un asesor te atenderá con gusto.`

const FALLBACK = `No estoy seguro de haber entendido 😅

Puedo ayudarte con información sobre:

1️⃣ 📦 Planes y precios
2️⃣ 💳 Cómo pagar tu plan
3️⃣ 📋 Cómo funcionan los préstamos
4️⃣ 👥 Cómo crear vendedores
5️⃣ 🧑 Cómo crear clientes
6️⃣ 🏢 Cómo crear tu empresa

Escribe el número de la opción o tu pregunta. También puedes visitar 🌐 ${SITE_URL}`

const BY_NUMBER: Record<string, string> = {
  '1': PLANES,
  '2': PAGAR_PLAN,
  '3': PRESTAMOS,
  '4': VENDEDORES,
  '5': CLIENTES,
  '6': EMPRESA,
}

const INTENTS: Intent[] = [
  {
    keywords: ['como pagar', 'pagar mi plan', 'pagar el plan', 'pagar plan', 'pagar la suscripcion', 'pagar suscripcion', 'metodo de pago', 'forma de pago', 'pago del plan', 'pago', 'pagar', 'tarjeta', 'wompi', 'stripe', 'factura', 'renovar', 'renovacion', 'billing'],
    response: PAGAR_PLAN,
  },
  {
    keywords: ['plan', 'planes', 'precio', 'precios', 'tarifa', 'tarifas', 'costo', 'cuanto cuesta', 'cuanto vale', 'mensual', 'anual', 'empresarial', 'independiente', 'corporativo'],
    response: PLANES,
  },
  {
    keywords: ['prestamo', 'prestamos', 'credito', 'creditos', 'interes', 'tasa de interes', 'cuota', 'cuotas', 'plazo', 'abono', 'como cobro'],
    response: PRESTAMOS,
  },
  {
    keywords: ['vendedor', 'vendedores', 'agente', 'agentes', 'empleado', 'empleados', 'colaborador', 'colaboradores'],
    response: VENDEDORES,
  },
  {
    keywords: ['cliente', 'clientes', 'deudor', 'deudores'],
    response: CLIENTES,
  },
  {
    keywords: ['empresa', 'crear cuenta', 'registrar', 'registro', 'registrarme', 'subdominio', 'empezar', 'comenzar', 'como empiezo', 'crear mi empresa', 'crear la empresa'],
    response: EMPRESA,
  },
  {
    keywords: ['prueba gratis', 'prueba', 'trial', 'gratis', 'gratuito', 'demostracion', 'demo'],
    response: PRUEBA,
  },
  {
    keywords: ['contacto', 'asesor', 'hablar con alguien', 'atencion humana', 'ubicacion', 'donde estan', 'correo electronico'],
    response: CONTACTO,
  },
  {
    keywords: ['que es kredipay', 'que es kredi pay', 'kredipay', 'kredi pay', 'informacion', 'opciones', 'menu'],
    response: INTRO,
  },
  {
    keywords: ['hola', 'buenas', 'buenos dias', 'buenas tardes', 'buenas noches', 'saludos', 'que tal'],
    response: WELCOME,
  },
]

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(kw)}([^a-z0-9]|$)`, 'i')
    return pattern.test(text)
  })
}

export function getBotResponse(input: string): string {
  const text = normalize(input)
  if (!text) return FALLBACK

  const numberMatch = text.match(/^[1-6]$/)
  if (numberMatch && BY_NUMBER[numberMatch[0]]) return BY_NUMBER[numberMatch[0]]

  for (const intent of INTENTS) {
    if (matchesAny(text, intent.keywords)) return intent.response
  }
  return FALLBACK
}

export { WELCOME, FALLBACK }
