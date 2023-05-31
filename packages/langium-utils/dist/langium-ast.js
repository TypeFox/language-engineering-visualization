"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangiumAST = void 0;
/**
 * Provides utilities for deserializing Langium ASTs
 */
class LangiumAST {
    // Identify an AST node by it's type & shape
    isReference(obj) {
        return typeof obj === 'object' && obj !== null && typeof obj.$ref === 'string';
    }
    // Identify a ref by its type & shape as well
    isAstNode(obj) {
        return typeof obj === 'object' && obj !== null && typeof obj.$type === 'string';
    }
    /* SFC32 (Simple Fast Counter PRNG), a variant at least */
    sfc32(a, b, c, d) {
        return function () {
            // right shift assign all values
            a >>>= 0;
            b >>>= 0;
            c >>>= 0;
            d >>>= 0;
            let t = (a + b) | 0;
            a = b ^ b >>> 9;
            b = c + (c << 3) | 0;
            c = c << 21 | c >>> 11;
            d = d + 1 | 0;
            t = t + d | 0;
            c = c + t | 0;
            return (t >>> 0) / 4294967296;
        };
    }
    toHash(v) {
        let hash = 0;
        for (let i = 0; i < v.length; i++) {
            const n = v.codePointAt(i);
            hash = (hash << 2) - hash + n;
        }
        return hash;
    }
    /**
     * Takes a string, and using it produces a deterministic hex string
     */
    toHex(v) {
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
    astToTreemapData(node) {
        const treemap = {
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
            }
            else if (this.isAstNode(item)) {
                treemap.children.push(this.astToTreemapData(item));
            }
        }
        treemap.size = treemap.children.length + 1;
        return treemap;
    }
    getASTCrossRefs(node) {
        const crossRefs = [];
        for (const [propertyName, item] of Object.entries(node)) {
            if (propertyName === '$container') {
                continue;
            }
            if (Array.isArray(item)) {
                for (const element of item) {
                    if (this.isReference(element)) {
                        crossRefs.push(element);
                    }
                    else if (this.isAstNode(element)) {
                        crossRefs.push(...this.getASTCrossRefs(element));
                    }
                }
            }
            else if (this.isReference(item)) {
                crossRefs.push(item);
            }
            else if (this.isAstNode(item)) {
                crossRefs.push(...this.getASTCrossRefs(item));
            }
        }
        return crossRefs;
    }
    /**
     * Takes a Langium AST, and produces a node & edges graph representation
     */
    astToGraph(node) {
        let parentId = 0;
        const graph = {
            nodes: [],
            edges: []
        };
        const _this = this;
        function _astToGraph(node) {
            node.$__dotID = parentId;
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
                }
                if (_this.isAstNode(item)) {
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
    graphToDOT(graph) {
        const prog = [
            'strict digraph {'
        ];
        for (const node of graph.nodes) {
            const hex = this.toHex(node.$type);
            prog.push(node.$__dotID + ' [label="' + node.$type + '" style=filled fillcolor="' + hex + '" fontcolor=white fontsize=32]');
        }
        for (const edge of graph.edges) {
            prog.push(edge.from.$__dotID + ' -> ' + edge.to.$__dotID);
        }
        prog.push('}');
        return prog.join('\n');
    }
    // Takes the root, and a path string, traversing the root to find the node denoted by the path
    getAstNode(root, path) {
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
                const array = previousValue[property];
                return array === null || array === void 0 ? void 0 : array[arrayIndex];
            }
            // instead, index one farther down the tree using the current value
            return previousValue[currentValue];
        }, root);
    }
    // Link a given node
    linkNode(node, root, container, containerProperty, containerIndex) {
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
                    }
                    else if (this.isAstNode(element)) {
                        // another AST node we should link with proper details
                        this.linkNode(element, root, node, propertyName, index);
                    }
                }
            }
            else if (this.isReference(item)) {
                // single reference to handle
                item.ref = this.getAstNode(root, item.$ref);
            }
            else if (this.isAstNode(item)) {
                // single ast node to handle
                this.linkNode(item, root, node, propertyName);
            }
        }
    }
    // link given ast
    linkAst(root) {
        this.linkNode(root, root);
    }
    /**
    * Takes a string corresponding to a serialized Langium AST, and returns a deserialized AST node
    *
    * @param content String to parse & deserialize
    * @returns A Langium AST with cross-refs restored
    */
    deserializeAST(content) {
        const root = JSON.parse(content);
        this.linkNode(root, root);
        return root;
    }
}
exports.LangiumAST = LangiumAST;
//# sourceMappingURL=langium-ast.js.map