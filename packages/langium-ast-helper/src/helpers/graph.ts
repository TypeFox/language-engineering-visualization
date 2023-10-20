/**
 * Helper for creating a generalized Nodes & Edges graph representation
 * from a serialized AST
 */

import { AstNode } from "../langium-types";
import { isAstNode } from "../langium-utils";
import { toHex } from "../utils";

/**
 * Graph representation of an AST, composed of nodes & edges (and preserving the AstNodes themselves)
 */
export type Graph = {
    nodes: AstNode[]
    edges: Edge[]
};

/**
 * Edge in a graph, between 2 AstNodes
 */
export type Edge = {
    from: AstNode;
    to: AstNode;
}

/**
 * Takes a Langium AST, and produces a node & edges graph representation
 */
export function convertASTtoGraph(node: AstNode): Graph {
    let parentId = 0;

    const graph: Graph = {
        nodes: [],
        edges: []
    };

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
                    if (isAstNode(element)) {
                        graph.edges.push({
                            from: node,
                            to: element
                        });
                        parentId++;
                        _astToGraph(element);
                    }
                }
            } if (isAstNode(item)) {
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
 * Takes a graph representation of an AST, and outputs a concrete DOT program as a string
 *
 * @param graph Graph representation of an AST
 * @returns DOT program as a string
 */
export function convertGraphtoDOT(graph: Graph): string {
    const prog: string[] = [
        'strict digraph {'
    ];
    for (const node of graph.nodes) {
        const hex = toHex(node.$type);
        prog.push((node as any).$__dotID + ' [label="'+node.$type+'" style=filled fillcolor="'+hex+'" fontcolor=white fontsize=32]');
    }
    for (const edge of graph.edges) {
        prog.push((edge.from as any).$__dotID + ' -> ' + (edge.to as any).$__dotID);
    }
    prog.push('}');
    return prog.join('\n');
}