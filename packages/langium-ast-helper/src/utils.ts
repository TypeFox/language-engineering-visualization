/**
 * General utilities
 */

/**
 * Produces an arbitrary (but deterministic) hex string from a given input string.
 * Used to map a given AST node to some color
 * 
 * @param v Value to convert to a hex color string
 * @returns A hex color string, #xxxxxx
 */
export function toHex(v: string): string {
    let hash = toHash(v);
    let rand = sfc32(hash, hash >> 2, hash << 2, hash & hash);
    // get 6 random characters
    let hex = '#';
    for (let i = 0; i < 6; i++) {
        hex += Math.floor(rand() * 100000 % 10);
    }
    return hex;
}

/**
 * SFC32 (Simple Fast Counter PRNG)
 * Produces a seeded function that returns pseudo-random numbers
 *
 * @param a 1st byte of seed
 * @param b 2nd byte of seed
 * @param c 3rd byte of seed
 * @param d 4th byte of seed
 * @returns A pseudo-random function generator, seeded using the given values
 */
function sfc32(a: number, b: number, c: number, d: number): () => number {
    return function() {
      // right shift assign all values
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = c << 21 | c >>> 11;
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

/**
 * Produces a simple hash code for a given string
 * 
 * @param v String to convert to a hash code
 * @returns Numeric hash code
 */
function toHash(v: string): number {
    let hash = 0;
    for (let i = 0; i < v.length; i++) {
        const n = v.codePointAt(i) as number;
        hash = (hash << 2) - hash + n;
    }
    return hash;
}