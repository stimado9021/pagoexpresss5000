import { randomInt } from 'node:crypto'

const MAYUS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const MINUS = 'abcdefghijkmnopqrstuvwxyz'
const NUMEROS = '23456789'
const TODOS = MAYUS + MINUS + NUMEROS

export function generarPasswordAleatoria(longitud = 12): string {
  if (longitud < 4) longitud = 4
  const partes = [
    MAYUS[randomInt(MAYUS.length)],
    MINUS[randomInt(MINUS.length)],
    NUMEROS[randomInt(NUMEROS.length)],
  ]
  while (partes.length < longitud) {
    partes.push(TODOS[randomInt(TODOS.length)])
  }
  for (let i = partes.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[partes[i], partes[j]] = [partes[j], partes[i]]
  }
  return partes.join('')
}
