import { AstNode, Reference } from "./langium-types";
import { isAstNode, isReference } from "./langium-utils";

/**
* Takes a string corresponding to a serialized Langium AST, and returns a deserialized AST node
* 
* @param content String to parse & deserialize
* @returns A Langium AST with cross-refs restored
*/
export function deserializeAST(content: string): AstNode {
    const root = JSON.parse(content);
    linkNode(root, root);
    return root;
}

/**
 * Returns an array of all Cross-Refs contained in a given AstNode.
 * Will evaluate recursively until the entire tree is traversed.
 * 
 * @param node AstNode to retrieve all cross-references from itself and its children
 * @returns An array of cross references
 */
export function getASTCrossRefs(node: AstNode): Reference<AstNode>[] {
    const crossRefs = [];
    for (const [propertyName, item] of Object.entries(node)) {
        if (propertyName === '$container') {
            continue;
        }
        if (Array.isArray(item)) {
            for (const element of item) {
            if (isReference(element)) {
                crossRefs.push(element);
            } else if (isAstNode(element)) {
                crossRefs.push(...getASTCrossRefs(element));
            }
            }
        } else if (isReference(item)) {
            crossRefs.push(item);
        } else if (isAstNode(item)) {
            crossRefs.push(...getASTCrossRefs(item));
        }
    }
    return crossRefs;
}

/**
 * Takes the root, and a path string, traversing the root to find the node denoted by the path
 *
 * @param root Root node to traverse
 * @param path Path to traverse, in the form of #/path/to/node
 * @returns The specified node by the path, or undefined if not found
 */
function getAstNode(root: AstNode, path: string): AstNode | undefined {
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

/**
 * Link a given node, reconstructing itself and its subtree with proper cross-references
 *
 * @param node Node to link
 * @param root Root to link node within (can be itself for root)
 * @param container Container node, if any (undefined for root)
 * @param containerProperty Container prop to set, if any
 * @param containerIndex Index of container (for arrays), if any
 */
function linkNode(node: AstNode, root: AstNode, container?: AstNode, containerProperty?: string, containerIndex?: number): void {
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
                if (isReference(element)) {
                    // reconstruct cross ref
                    element.ref = getAstNode(root, element.$ref);
                } else if (isAstNode(element)) {
                    // another AST node we should link with proper details
                    linkNode(element, root, node, propertyName, index);
                }
            }
        } else if (isReference(item)) {
            // single reference to handle
            item.ref = getAstNode(root, item.$ref);
        } else if (isAstNode(item)) {
            // single ast node to handle
            linkNode(item, root, node, propertyName);
        }
    }
}
