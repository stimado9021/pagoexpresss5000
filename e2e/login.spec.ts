import { test, expect, Page } from '@playwright/test'

const CEDULA = process.env.E2E_CEDULA || 'prestamosjudith'
const PASSWORD = process.env.E2E_PASSWORD || '52004483'

async function typeLogin(page: Page, cedula: string, password: string) {
  const idInput = page.getByPlaceholder('Identificación o correo')
  const pwInput = page.getByPlaceholder('••••••••')
  for (let attempt = 0; attempt < 3; attempt++) {
    await idInput.pressSequentially(cedula)
    if ((await idInput.inputValue()) === cedula) break
    await page.waitForTimeout(300)
  }
  await pwInput.pressSequentially(password)
}

test.describe('Login Kredipay', () => {
  test('muestra el formulario de acceso', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { name: 'Kredipay' })).toBeVisible()
    await expect(page.getByText('Cédula o correo')).toBeVisible()
    await expect(page.getByText('Contraseña')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()
    await expect(page.locator('img[alt="Kredipay"]')).toBeVisible()
    await expect(page.getByRole('link', { name: '← Volver al inicio' })).toBeVisible()
  })

  test('redirige a /empresario con credenciales válidas', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await typeLogin(page, CEDULA, PASSWORD)
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await page.waitForURL('**/empresario', { timeout: 15000 })
    await expect(page).toHaveURL(/\/empresario/)
  })

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await typeLogin(page, 'usuario-inexistente-xyz', 'clave-incorrecta')
    await page.getByRole('button', { name: 'Ingresar' }).click()
    await expect(page.getByText('Credenciales incorrectas')).toBeVisible()
    await expect(page).not.toHaveURL(/\/empresario/)
  })
})
