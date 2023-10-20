/**
 * Helper for creating TreeMap data from a serialized AST
 * Particularly well-suited for D3 visualizations
 */

import { AstNode } from "../langium-types";
import { isAstNode } from "../langium-utils";
import { toHex } from "../utils";

export type TreemapData = {
    title: string;
    color: string;
    size: number;
    children: TreemapData[];
};

/**
 * Takes an AST, and exports a tree-like structure, matched to the d3-flare style dataset.
 * Thus compatible with most D3 tree/graph visualizations
 * 
 * @param node Node to convert to a tree map
 */
export function convertASTtoTreeMap(node: AstNode): TreemapData {
    const treemap: TreemapData = {
        title: node.$type,
        children: [],
        color: toHex(node.$type),
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
                if (isAstNode(element)) {
                    treemap.children.push(convertASTtoTreeMap(element));
                }
            }
        } else if (isAstNode(item)) {
            treemap.children.push(convertASTtoTreeMap(item));
        }
    }
    treemap.size = treemap.children.length + 1;
    return treemap;
}