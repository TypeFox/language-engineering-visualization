
export type Graph = {
    nodes: AstNode[]
    edges: Edge[]
};

export type Edge = {
    from: AstNode;
    to: AstNode;
}

export type TreemapData = {
    title: string;
    color: string;
    size: number;
    children: TreemapData[];
};


/**
 * Provides utilities for deserializing Langium ASTs
 */
export class LangiumAST {
    // Identify an AST node by it's type & shape
    isReference(obj: unknown): obj is Reference {
        return typeof obj === 'object' && obj !== null && typeof (obj as Reference).$ref === 'string';
    }

    // Identify a ref by its type & shape as well
    isAstNode(obj: unknown): obj is AstNode {
        return typeof obj === 'object' && obj !== null && typeof (obj as AstNode).$type === 'string';
    }
    
    
    /* SFC32 (Simple Fast Counter PRNG), a variant at least */
    private sfc32(a: number, b: number, c: number, d: number) {
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
    
    
    private toHash(v: string): number {
        let hash = 0;
        for (let i = 0; i < v.length; i++) {
            const n = v.codePointAt(i) as number;
            hash = (hash << 2) - hash + n;
        }
        return hash;
    }
    
    /**
     * Takes a string, and using it produces a deterministic hex string
     */
    private toHex(v: string): string {
        let hash = this.toHash(v);
        let rand = this.sfc32(hash, hash >> 2, hash << 2, hash & hash);
        // get 6 random characters
        let hex = '#';
        for (let i = 0; i < 6; i++) {
            hex += Math.floor(rand() * 100000 % 10);
        }
        return hex;
    }
    
    /**
     * Takes an AST, and exports a tree-like structure, matched to the d3-flare style dataset.
     * Thus compatible with most D3 tree/graph visualizations
     * 
     * @param node Node to convert to a tree map
     */
    astToTreemapData(node: AstNode): TreemapData {
        const treemap: TreemapData = {
            title: node.$type,
            children: [],
            color: this.toHex(node.$type),
            size: 0
        };
        for (const [propertyName, item] of Object.entries(node)) {
    
            if (propertyName === '$container') {
                // don't evaluate containers again (causes a recursive loop)
                continue;
            }
    
            if (Array.isArray(item)) {
                // Array of refs/nodes
                for (const element of item) {
                    if (this.isAstNode(element)) {
                        treemap.children.push(this.astToTreemapData(element));
                    }
                }
            } else if (this.isAstNode(item)) {
                treemap.children.push(this.astToTreemapData(item));
            }
        }
        treemap.size = treemap.children.length + 1;
        return treemap;
    }
    
    getASTCrossRefs(node: AstNode): Reference<AstNode>[] {
        const crossRefs = [];
        for (const [propertyName, item] of Object.entries(node)) {
            if (propertyName === '$container') {
                continue;
            }
            if (Array.isArray(item)) {
                for (const element of item) {
                if (this.isReference(element)) {
                    crossRefs.push(element);
                } else if (this.isAstNode(element)) {
                    crossRefs.push(...this.getASTCrossRefs(element));
                }
                }
            } else if (this.isReference(item)) {
                crossRefs.push(item);
            } else if (this.isAstNode(item)) {
                crossRefs.push(...this.getASTCrossRefs(item));
            }
        }
        return crossRefs;
    }
    
    /**
     * Takes a Langium AST, and produces a node & edges graph representation
     */
    astToGraph(node: AstNode): Graph {
        let parentId = 0;
    
        const graph: Graph = {
            nodes: [],
            edges: []
        };
        const _this = this;
    
        function _astToGraph(node: AstNode): void {
            (node as any).$__dotID = parentId;
            graph.nodes.push(node);
            for (const [propertyName, item] of Object.entries(node)) {
    
                if (propertyName === '$container') {
                    // don't evaluate containers again (causes a recursive loop)
                    continue;
                }
    
                if (Array.isArray(item)) {
                    // Array of refs/nodes
                    for (const element of item) {
                        if (_this.isAstNode(element)) {
                            graph.edges.push({
                                from: node,
                                to: element
                            });
                            parentId++;
                            _astToGraph(element);
                        }
                    }
                } if (_this.isAstNode(item)) {
                    graph.edges.push({
                        from: node,
                        to: item
                    });
                    parentId++;
                    _astToGraph(item);
                }
            }
        }
    
        _astToGraph(node);
    
        return graph;
    }
    
    /**
     * Takes a graph representation of an AST, and outputs a concrete DOT program
     */
    graphToDOT(graph: Graph): string {
        const prog: string[] = [
            'strict digraph {'
        ];
        for (const node of graph.nodes) {
            const hex = this.toHex(node.$type);
            prog.push((node as any).$__dotID + ' [label="'+node.$type+'" style=filled fillcolor="'+hex+'" fontcolor=white fontsize=32]');
        }
        for (const edge of graph.edges) {
            prog.push((edge.from as any).$__dotID + ' -> ' + (edge.to as any).$__dotID);
        }
        prog.push('}');
        return prog.join('\n');
    }

    // Takes the root, and a path string, traversing the root to find the node denoted by the path
    getAstNode(root: AstNode, path: string): AstNode | undefined {
        if (!path.startsWith('#')) {
            // this isn't something we can decode, skip
            return undefined;
        }

        // break up path segments for traversal
        const segments = path.substring(1).split('/');

        return segments.reduce((previousValue, currentValue) => {
            if (!previousValue || currentValue.length === 0) {
                // no root or nothing else to check, return what we have so far
                return previousValue;
            }
            const propertyIndex = currentValue.indexOf('@');
            if (propertyIndex > 0) {
                // Array part of path to extract
                const property = currentValue.substring(0, propertyIndex);
                // get array index using prop
                const arrayIndex = parseInt(currentValue.substring(propertyIndex + 1));
                // find array with prop & return via index
                const array = (previousValue as unknown as Record<string, AstNode[]>)[property];
                return array?.[arrayIndex];
            }
            // instead, index one farther down the tree using the current value
            return (previousValue as unknown as Record<string, AstNode>)[currentValue];
        }, root);
    }


    // Link a given node
    linkNode(node: AstNode, root: AstNode, container?: AstNode, containerProperty?: string, containerIndex?: number): void {
        // set container details, if any (undefined for root)
        node.$containerProperty = containerProperty;
        node.$containerIndex = containerIndex;
        node.$container = container;

        // iterate over all props in this node
        for (const [propertyName, item] of Object.entries(node)) {

            if (propertyName === '$container') {
                // don't evaluate containers again (causes a recursive loop)
                continue;
            }

            if (Array.isArray(item)) {
                // Array of refs/nodes
                for (let index = 0; index < item.length; index++) {
                    const element = item[index];
                    if (this.isReference(element)) {
                        // reconstruct cross ref
                        element.ref = this.getAstNode(root, element.$ref);
                    } else if (this.isAstNode(element)) {
                        // another AST node we should link with proper details
                        this.linkNode(element, root, node, propertyName, index);
                    }
                }
            } else if (this.isReference(item)) {
                // single reference to handle
                item.ref = this.getAstNode(root, item.$ref);
            } else if (this.isAstNode(item)) {
                // single ast node to handle
                this.linkNode(item, root, node, propertyName);
            }
        }
    }

    /**
    * Takes a string corresponding to a serialized Langium AST, and returns a deserialized AST node
    * 
    * @param content String to parse & deserialize
    * @returns A Langium AST with cross-refs restored
    */
    deserializeAST(content: string): AstNode {
        const root = JSON.parse(content);
        this.linkNode(root, root);
        return root;
    }
}

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
