/**
 * Utility functions for working with Langium AST types
 */

import { AstNode, Reference } from "./langium-types";

/**
 * Identify an AST node by it's type & shape
 *
 * @param obj 
 * @returns 
 */
export function isReference(obj: unknown): obj is Reference {
    return typeof obj === 'object' && obj !== null && typeof (obj as Reference).$ref === 'string';
}

/**
 * Identify a ref by its type & shape as well
 * @param obj 
 * @returns 
 */
export function isAstNode(obj: unknown): obj is AstNode {
    return typeof obj === 'object' && obj !== null && typeof (obj as AstNode).$type === 'string';
}