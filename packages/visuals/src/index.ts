import { AstNode, convertASTtoGraph, deserializeAST } from 'langium-ast-helper';
import ForceGraph3D from '3d-force-graph';
// import SpriteText from 'three-spritetext';

async function setup(data: string, elementId: string) {
    // fetch a serialized AST that we already generated
    const serializedAst = await fetch('http://localhost:3000/data/' + data).then(response => response.text());

    // deserialize this AST
    const ast: AstNode = deserializeAST(serializedAst);

    // get a graph
    const graph = convertASTtoGraph(ast);

    // graph constructed from this AST
    // let val = 1;
    const gData = {
        nodes: graph.nodes.map(node => ({
            id: (node as unknown as { $__dotID: string }).$__dotID,
            nodeType: node.$type,
            // nodeValue: val++
        })),
        links: graph.edges.map(edge => ({
                source: (edge.from as unknown as { $__dotID: string }).$__dotID,
                target: (edge.to as unknown as { $__dotID: string }).$__dotID
            }))
    };

    const distance = 1400;

    // produce a graph visualization
    const Graph = ForceGraph3D()
        (document.getElementById(elementId) as HTMLElement)

        // top-down tree layout
        .dagMode('td')

        // constrain
        .width(500)
        .height(400)

        // auto color of nodes
        .nodeAutoColorBy('nodeType')

        // labels on nodes
        .nodeLabel(node => (node as any).nodeType)

        // on click handler
        // .onNodeClick(node => alert('Clicked: ' + (node as any).nodeType))

        // arrows
        .linkDirectionalArrowLength(3.5)
        .linkDirectionalArrowRelPos(1)

        // particle effects on links
        // .linkDirectionalParticles(2)
        // .linkDirectionalParticleWidth(0.8)
        // .linkDirectionalParticleSpeed(0.006)

        // textual nodes
        // .nodeThreeObject(node => {
        //     const sprite = new SpriteText((node as any).nodeType);
        //     sprite.material.depthWrite = false; // make sprite background transparent
        //     // sprite.color = '#fff';
        //     sprite.textHeight = 8;
        //     return sprite;
        // })

        // orbiting camera
        .showNavInfo(true)
        .cameraPosition({ z: distance })

        // reset positional on click handler
        .onNodeClick((node: any) => {
            // Aim at node from outside it
            const distance = 200;
            const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

            const newPos = node.x || node.y || node.z
                ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
                : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

            Graph.cameraPosition(
                newPos, // new position
                node, // lookAt ({ x, y, z })
                1000  // ms transition duration
            );
        })

        .graphData(gData);

        // // resize once done w/ the layout
        // Graph.onEngineStop(() => Graph.zoomToFit(400));


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

// set this up for each of the data entries we have
setup('minilogo-grammar.ast.json', 'graph-1');
setup('arithmetics-grammar.ast.json', 'graph-2');
setup('domainmodel-grammar.ast.json', 'graph-3');
setup('statemachine-grammar.ast.json', 'graph-4');
setup('langium-grammar.ast.json', 'graph-5');
setup('lox-grammar.ast.json', 'graph-6');