export declare type Graph = {
    nodes: AstNode[];
    edges: Edge[];
};
export declare type Edge = {
    from: AstNode;
    to: AstNode;
};
export declare type TreemapData = {
    title: string;
    color: string;
    size: number;
    children: TreemapData[];
};
/**
 * Provides utilities for deserializing Langium ASTs
 */
export declare class LangiumAST {
    isReference(obj: unknown): obj is Reference;
    isAstNode(obj: unknown): obj is AstNode;
    private sfc32;
    private toHash;
    /**
     * Takes a string, and using it produces a deterministic hex string
     */
    private toHex;
    /**
     * Takes an AST, and exports a tree-like structure, matched to the d3-flare style dataset.
     * Thus compatible with most D3 tree/graph visualizations
     *
     * @param node Node to convert to a tree map
     */
    astToTreemapData(node: AstNode): TreemapData;
    getASTCrossRefs(node: AstNode): Reference<AstNode>[];
    /**
     * Takes a Langium AST, and produces a node & edges graph representation
     */
    astToGraph(node: AstNode): Graph;
    /**
     * Takes a graph representation of an AST, and outputs a concrete DOT program
     */
    graphToDOT(graph: Graph): string;
    getAstNode(root: AstNode, path: string): AstNode | undefined;
    linkNode(node: AstNode, root: AstNode, container?: AstNode, containerProperty?: string, containerIndex?: number): void;
    linkAst(root: AstNode): void;
    /**
    * Takes a string corresponding to a serialized Langium AST, and returns a deserialized AST node
    *
    * @param content String to parse & deserialize
    * @returns A Langium AST with cross-refs restored
    */
    deserializeAST(content: string): AstNode;
}

/**
 * General position data for diagnostics
 */
declare type Pos = {
    character: number;
    line: number;
};
/**
 * Diagnostics that can be returned in a DocumentChange response
 */
export declare type Diagnostic = {
    code: string;
    message: string;
    range: {
        start: Pos;
        end: Pos;
    };
    severity: number;
    source: string;
};
/**
 * Response for a DocumentChange notification
 */
export declare type DocumentChangeResponse = {
    uri: string;
    content: string;
    diagnostics: Diagnostic[];
};
/**
* Approximation of a langium AST, capturing the most relevant information
*/
export interface AstNode {
    $type: string;
    $container?: AstNode;
    $containerProperty?: string;
    $containerIndex?: number;
}
export interface Reference<T extends AstNode = AstNode> {
    ref?: T;
    $ref: string;
}
export {};
