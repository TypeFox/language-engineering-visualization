/**
 * Various Langium types that are needed to decode (and verify) serialized ASTs correctly
 */

/**
 * General position data for diagnostics
 */
type Pos = {
    character: number;
    line: number;
}

/**
 * Diagnostics that can be returned in a DocumentChange response
 */
export type Diagnostic = {
    // general string-based code for this diagnostic (like 'linking-error')
    code: string;
    // user-friendly diagnostic message
    message: string;
    // start -> end range of the diagnostic
    range: {
        start: Pos;
        end: Pos;
    }
    // severity code
    severity: number;
    // source language by string
    source: string;
};

/**
 * Response for a DocumentChange notification
 */
export type DocumentChangeResponse = {
    uri: string;
    content: string;
    diagnostics: Diagnostic[];
};

/**
* Approximation of a Langium AST, capturing the most relevant information
*/
export interface AstNode {
    $type: string;
    $container?: AstNode;
    $containerProperty?: string;
    $containerIndex?: number;
}

/**
 * Reference type, which defaults to AstNode
 */
export interface Reference<T extends AstNode = AstNode> {
    ref?: T;
    $ref: string
}