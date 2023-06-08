# Langium HAT (Helpers for AST Transformations)

A helpful package for AST transformations for Langium-based languages.

The goal of this package is to keep it as simple as possible to turn Langium-based language ASTs into workable data, independent of Langium itself. This is done by providing a simple API for traversing ASTs and extracting data from them, along with some helpers to transform to common data formats (TreeMaps, Graphs, etc.).

Provided you have a working Langium-based language, you can add the langium-hat to your project and start using it immediately to consume AST data.

Can be used for the purposes of:
- data analysis on ASTs
- graphing of AST structures
- visualizations tied to ASTs
- any other applications that need to consume AST-derived data