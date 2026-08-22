import { test, expect, Page } from '@playwright/test'

async function typeField(page: Page, selector: string, value: string) {
  const input = page.locator(selector)
  for (let attempt = 0; attempt < 3; attempt++) {
    await input.pressSequentially(value)
    if ((await input.inputValue()) === value) break
    await page.waitForTimeout(300)
  }
}

test.describe('Landing page Kredipay', () => {
  test('carga con título y encabezado principal', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await expect(page).toHaveTitle(/prestamistas/)
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('préstamos')
  })

  test('muestra la navegación con las secciones clave', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    for (const label of ['Beneficios', 'Planes', 'Oferta', 'Registro']) {
      await expect(page.locator(`header#site-nav`).getByText(label).first()).toBeVisible()
    }
    await expect(page.locator('#beneficios')).toBeVisible()
    await expect(page.locator('#planes')).toBeVisible()
    await expect(page.locator('#registro')).toBeVisible()
  })

  test('la sección FAQ existe y el acordeón funciona', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const faq = page.locator('#faq')
    await expect(faq).toBeVisible()

    const firstDetails = faq.locator('details').first()
    const answer = firstDetails.locator('p')
    await expect(answer).toBeHidden()

    await firstDetails.locator('summary').click()
    await expect(answer).toBeVisible()
    await expect(answer).not.toHaveText('')
  })

  test('incluye schema FAQPage (JSON-LD) sincronizado', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    const scripts = page.locator('script[type="application/ld+json"]')
    const count = await scripts.count()
    expect(count).toBeGreaterThan(0)

    let hasFaqPage = false
    for (let i = 0; i < count; i++) {
      const text = await scripts.nth(i).textContent()
      if (text && text.includes('FAQPage')) hasFaqPage = true
    }
    expect(hasFaqPage).toBe(true)
  })

  test('el formulario de registro valida el subdominio corto', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' })
    await typeField(page, '#empresa', 'Créditos del Valle S.A.S')
    await typeField(page, '#admin', 'Juan')
    await typeField(page, '#adminApellido', 'Pérez')
    await typeField(page, '#correo', 'juan@creditosdelvalle.com')
    await typeField(page, '#telefono', '3001234567')
    await typeField(page, '#subdominio', 'ab')
    await typeField(page, '#password', '12345678')
    await typeField(page, '#confirmPassword', '12345678')
    await page.locator('#registro-form input[type="checkbox"]').check()

    await page.getByRole('button', { name: 'Crear mi espacio de trabajo' }).click()
    await expect(page.getByText('Elige un subdominio de al menos 3 caracteres.')).toBeVisible()
  })
})
