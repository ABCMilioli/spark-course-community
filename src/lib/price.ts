// Utilitário para padronizar o tratamento de preços no frontend
// Garante que preços vindos como string sejam convertidos para número

/**
 * Converte um preço para número, independente se vem como string ou number
 * @param price - Preço que pode ser string ou number
 * @returns Número representando o preço, ou 0 se inválido
 */
export function parsePrice(price: string | number | null | undefined): number {
  if (price === null || price === undefined) return 0;
  
  // Se já é número, retorna como está
  if (typeof price === 'number') return price;
  
  // Se é string, converte para número
  if (typeof price === 'string') {
    const parsed = Number(price);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
}

/**
 * Formata um preço para exibição (R$ X,XX)
 * @param price - Preço que pode ser string ou number
 * @returns String formatada do preço
 */
export function formatPrice(price: string | number | null | undefined): string {
  const numericPrice = parsePrice(price);
  return `R$ ${numericPrice.toFixed(2)}`;
}

/**
 * Verifica se um curso é gratuito
 * @param price - Preço do curso
 * @returns true se o curso é gratuito
 */
export function isFreeCourse(price: string | number | null | undefined): boolean {
  return parsePrice(price) === 0;
}

/**
 * Verifica se um curso é pago
 * @param price - Preço do curso
 * @returns true se o curso é pago
 */
export function isPaidCourse(price: string | number | null | undefined): boolean {
  return parsePrice(price) > 0;
} 