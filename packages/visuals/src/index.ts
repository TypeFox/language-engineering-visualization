import { AstNode, convertASTtoGraph, deserializeAST } from 'langium-ast-helper';
import ForceGraph3D from '3d-force-graph';
import SpriteText from 'three-spritetext';

async function setup(data: string, elementId: string, graphType: string) {
    // fetch a serialized AST that we already generated
    const serializedAst = await fetch('http://localhost:3000/data/' + data).then(response => response.text());

    // deserialize this AST
    const ast: AstNode = deserializeAST(serializedAst);

    // get a graph
    const graph = convertASTtoGraph(ast);

    // graph constructed from this AST
    const gData = {
        nodes: graph.nodes.map(node => ({
            id: (node as unknown as { $__dotID: string }).$__dotID,
            nodeType: node.$type,
            node
        })),
        links: graph.edges.map(edge => ({
                source: (edge.from as unknown as { $__dotID: string }).$__dotID,
                target: (edge.to as unknown as { $__dotID: string }).$__dotID
            }))
    };

    const distance = 1400;

    const elm = document.getElementById(elementId) as HTMLElement;
    const isFullView = elm.getAttribute('full');

    const nodeSummaryElm = document.getElementById('node-summary') as HTMLElement | null;

    let width = 500;
    let height = 400;
    let spinning = true;
    
    if (isFullView) {
        width = window.innerWidth;
        height = window.innerHeight;
        spinning = false;
    }

    // produce a graph visualization
    const Graph = ForceGraph3D()
        (elm)

        // top-down tree layout
        .dagMode(graphType as any)

        // constrain
        .width(width)
        .height(height)

        // auto color of nodes
        // .nodeAutoColorBy('nodeType')
        .nodeColor(node => toHex((node as any).nodeType))

        // labels on nodes are names or types, in that order
        .nodeLabel(node => (node as any).node.name ? (node as any).node.name : (node as any).nodeType)

        // on click handler
        // .onNodeClick(node => alert('Clicked: ' + (node as any).nodeType))

        // arrows
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1)

        // particle effects on links
        // .linkDirectionalParticles(2)
        // .linkDirectionalParticleWidth(0.8)
        // .linkDirectionalParticleSpeed(0.006)

        // orbiting camera
        .showNavInfo(true)
        .cameraPosition({ z: distance })

        .graphData(gData);

    // resize once done w/ the layout
    // Graph.onEngineStop(() => Graph.zoomToFit(400));

    // textual nodes
    if (isFullView) {
        // reset positional on click handler
        Graph.onNodeClick(selectNode);

        Graph.nodeThreeObject(node => {
            const sprite = new SpriteText((node as any).node.name ? (node as any).node.name : (node as any).nodeType);
            sprite.material.depthWrite = false; // make sprite background transparent
            sprite.color = toHex((node as any).nodeType);
            sprite.textHeight = 8;
            return sprite;
        });
    }

    if (spinning) {
        // orbiting camera calculation
        let angle = 0;
        setInterval(() => {
        Graph.cameraPosition({
            x: distance * Math.sin(angle),
            z: distance * Math.cos(angle)
        });
        angle += Math.PI / 300;
        }, 10);
    }

    // select an arbitrary node
    function selectNode(node: any) {
        // Aim at node from outside it
        const distance = 200;
        const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
        node.selected = true;
        
        if (nodeSummaryElm) {
            // populate info about this element
            const coreNode = node.node as AstNode;
            const properties = Object.getOwnPropertyNames(coreNode);
            const filtered = properties.filter(p => p !== '$type' && p !== '$__dotID');

            // collect all parents
            let parentLinks = [];
            let parent = coreNode.$container as (AstNode & { $__dotID: string, name?: string }) | undefined;
            while (parent) {
                if (parent) {
                    const index: number = parentLinks.length + 1;
                    parentLinks.unshift(`<a href='#' onclick='jumpTo(${parent.$__dotID})'>${index}: ${parent.name ? parent.name : parent.$type}</a><br/>`);
                }
                parent = parent.$container as (AstNode & { $__dotID: string }) | undefined;
            }

            nodeSummaryElm.innerHTML = parentLinks.join('') + node.nodeType + '<ul>' + filtered.map(p => {
                if (p === '$containerProperty' && coreNode['$containerProperty']) {
                    return `<li>${p}: ${coreNode['$containerProperty']}</li>`;
                } else if (p === '$containerIndex' && coreNode['$containerIndex']) {
                    return `<li>${p}: ${coreNode['$containerIndex']}</li>`;
                } else if (p === '$container' && coreNode['$container']) {
                    return `<li>${p}: ${coreNode.$container?.$type}</li>`;
                } else {
                    const v = (coreNode as any)[p];
                    if (v !== undefined) {
                        if (typeof v !== 'object') {
                            // non-object
                            return `<li>${p}: ${v}</li>`;
                        } else if (Array.isArray(v)) {
                            if (v.length) {
                                // array
                                return `<li>${p}: Array[${v.length}]</li>`;
                            } else {
                                return '';
                            }
                        } else {
                            // object, show type if present
                            if (v.$type) {
                                return `<li>${p}: ${v.$type}</li>`;
                            } else if (p === 'rule') {
                                // ref to rule, show its name 
                                return `<li>${p}: ${v?.ref?.name ?? '...'}</li>`;
                            } else {
                                if (p === 'imports') {
                                    console.dir(v);
                                }
                                // otherwise just show the key
                                return `<li>${p}: ...</li>`;
                            }
                        }
                    }
                }
            }).join('') + '</ul>';
        }
    
        const newPos = node.x || node.y || node.z
            ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
            : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)
    
        Graph.cameraPosition(
            newPos, // new position
            node, // lookAt ({ x, y, z })
            1000  // ms transition duration
        );
    }
    
    // jump to an arbitrary node by its id
    function jumpTo(nodeId: string) {
        // find this node
        const node = gData.nodes.find(n => n.id === nodeId);
        
        // jump to it
        if (node) {
            selectNode(node);
        }
    }
    (window as any).jumpTo = jumpTo;
}

/**
 * Produces an arbitrary (but deterministic) hex string from a given input string.
 * Used to map a given AST node to some color
 * 
 * @param v Value to convert to a hex color string
 * @returns A hex color string, #xxxxxx
 */
function toHex(v: string): string {
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

// set this up for each of the data entries we have
const graphType = 'td';
setup('minilogo-grammar.ast.json', 'graph-minilogo', graphType);
setup('arithmetics-grammar.ast.json', 'graph-arithmetics', graphType);
setup('domainmodel-grammar.ast.json', 'graph-domainmodel', graphType);
setup('statemachine-grammar.ast.json', 'graph-statemachine', graphType);
setup('langium-grammar.ast.json', 'graph-langium', graphType);
setup('lox-grammar.ast.json', 'graph-lox', graphType);
setup('requirements-grammar.ast.json', 'graph-requirements', graphType);