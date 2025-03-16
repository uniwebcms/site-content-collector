// tools-src/math.ts
/**
 * Adds two numbers together.
 * @description This function performs addition.
 * @param {number   |  string} [a = "5" ] - The first number.
 * @param {number?} b - The second number.
 * @returns {number} The sum of a and b.
 * @example add(5, 5)
 */
export function add(a, b = 100) {
  return a + b;
}

/**
 * Multiplies two numbers.
 * @description This function multiplies two numbers.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} The product of a and b.
 */
export function multiply(a, b) {
  return a * b;
}
