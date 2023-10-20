# Langium AST Helper (for AST Transformations)

A helpful package for performing AST transformations for Langium-based languages.

The goal of this package is to keep it as simple as possible to turn Langium-based language ASTs into workable data, independent of Langium itself. This is done by providing a simple API for traversing ASTs and extracting data from them, along with some helpers to transform to common data formats (TreeMaps, Graphs, etc.). The intention is that the helper can be used in any environment, including the web, so long as you have a way to feed it a serialized AST.

Provided you have a working Langium-based language, you can add the **langium-ast-helper** to your project and start using it immediately to consume AST data.

Possible applications for the Langium AST Helper include:
- data analysis on ASTs
- graphing of AST structures
- visualizations tied directly to AST output
- any other applications that need to consume AST-derived data

It should be noted that this helper is designed to work with the JSONSerializer output provided by most Langium-based languages. You can see an example of how the JSON serializer is invoked [for the CLI in the MiniLogo example language](https://github.com/TypeFox/langium-minilogo/blob/main/src/cli/index.ts#L13-L18), and also as [part of a language-server worker for the Domainmodel example language](https://github.com/eclipse-langium/langium/blob/a4c7a58e9a79199d0f69cd3a9479c6ddfe99de21/examples/domainmodel/src/language-server/main-browser.ts#L27-L38).

## Usage

```ts
import { deserializeAST, convertASTtoGraph, convertGraphtoDOT } from 'langium-ast-helper';

// get a serialized AST from the cli, a build-phase listen from a worker, etc.
const jsonAst = ...;

// deserialize the AST, producing an object with cross references re-constructed
const ast = deserializeAST(jsonAst);

// convert the AST to nodes & edges graph representation
const graph = convertASTtoGraph(ast);

// convert this Graph representation into a DOT program
const dot = convertGraphtoDOT(graph);

// do something with your program!
```

You can see the [examples](../../packages/examples/src/index.ts) for more details.

Here's an example of taking a MiniLogo program that draws a series of squares, applying the steps above, and then rendering the resulting DOT program into a graph.

![MiniLogo program graph generated from a DOT specification, which in turn was derived from the StateMachine grammar.](https://github.com/TypeFox/language-engineering-visualization/blob/main/packages/langium-ast-helper/assets/minilogo-program-example.png)

Because Langium is written in its own language, we can also parse Langium grammars and generate DOT programs from them.

As an example, here's a DOT program that corresponds to transforming the grammar for the StateMachine example language into a DOT graph.
![StateMachine graph generated from a DOT specification, which in turn was derived from the StateMachine grammar.](https://github.com/TypeFox/language-engineering-visualization/blob/main/packages/langium-ast-helper/assets/statemachine-graph-example.png)

## Contributing

Additions are welcome! If you see a helpful transformation that is missing from this package, and would be useful for a large enough audience, feel free to make a PR to add it in.