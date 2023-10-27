import { AstNode, convertASTtoGraph, deserializeAST } from 'langium-ast-helper';
import ForceGraph3D from '3d-force-graph';

async function setup(data: string, elementId: string) {
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
            nodeType: node.$type
        })),
        links: graph.edges.map(edge => ({
                source: (edge.from as unknown as { $__dotID: string }).$__dotID,
                target: (edge.to as unknown as { $__dotID: string }).$__dotID
            }))
    };

    // produce a graph visualization
    const Graph = ForceGraph3D()
        (document.getElementById(elementId) as HTMLElement)
        .nodeAutoColorBy('nodeType')
        .nodeLabel(node => (node as any).nodeType)
        .onNodeClick(node => alert('Clicked: ' + (node as any).nodeType))
        .graphData(gData);
}

// set this up for each of the data entries we have
setup('minilogo-program.ast.json', 'graph-1');
setup('arithmetics-grammar.ast.json', 'graph-2');
setup('domainmodel-grammar.ast.json', 'graph-3');
setup('statemachine-grammar.ast.json', 'graph-4');
setup('langium-grammar.ast.json', 'graph-5');