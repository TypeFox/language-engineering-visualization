import { AstNode, convertASTtoGraph, convertGraphtoDOT, deserializeAST } from 'langium-ast-helper';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

// Produced from langium-minilogo by running:'./bin/minilogo.js generate examples/test.logo'
// This output was saved to program.ast.json here for a simple example
const serializedAst = readFileSync(path.join('.','minilogo-program.ast.json')).toString();

// deserialize this AST
const ast: AstNode = deserializeAST(serializedAst);

// get a graph
const graph = convertASTtoGraph(ast);

// finally get a DOT program
const dot = convertGraphtoDOT(graph);

// print & write to a file
// suitable for feeding into DOT:
// $ dot -Tpng -o program.ast.png program.dot.txt 
console.dir(dot);
writeFileSync('program.dot.txt', dot);