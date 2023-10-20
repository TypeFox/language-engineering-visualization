import './LangiumGrammarVisualizer.css';
import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';
import { UserConfig } from 'monaco-editor-wrapper';
import React, { createRef } from 'react';
import { DocumentChangeResponse, convertASTtoGraph, convertGraphtoDOT, deserializeAST } from 'langium-ast-helper';
import { Graphviz } from 'graphviz-react';

interface EditorState {
    asyncUserConfig: UserConfig;
    graph: any;
}
// Class that extends a react component with a render method
export class LangiumGrammarVisualizer extends React.Component<{}, EditorState> {

    monacoEditor: React.RefObject<MonacoEditorReactComp>;

    constructor(props: {}) {
        super(props);
        this.state = {
            asyncUserConfig: {} as UserConfig,
            graph: undefined as any
        };
        this.monacoEditor = createRef();
        // bind 'this' ref for callbacks to maintain parent context
        this.onMonacoLoad = this.onMonacoLoad.bind(this);
        this.onDocumentChange = this.onDocumentChange.bind(this);
    }

    async componentDidMount() {
        const text = `
/******************************************************************************
 * Copyright 2021 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/
grammar LangiumGrammar

entry Grammar:
    (
        isDeclared?='grammar' name=ID ('with' usedGrammars+=[Grammar:ID] (',' usedGrammars+=[Grammar:ID])*)?
        (definesHiddenTokens?='hidden' '(' (hiddenTokens+=[AbstractRule:ID] (',' hiddenTokens+=[AbstractRule:ID])*)? ')')?
    )?
    imports+=GrammarImport*
    (rules+=AbstractRule | interfaces+=Interface | types+=Type)+;

Interface:
    'interface' name=ID
    ('extends' superTypes+=[AbstractType:ID] (',' superTypes+=[AbstractType:ID])*)?
    SchemaType;

fragment SchemaType:
    '{' attributes+=TypeAttribute* '}' ';'?;

TypeAttribute:
    name=FeatureName (isOptional?='?')? ':' type=TypeDefinition ';'?;

TypeDefinition: UnionType;

UnionType infers TypeDefinition:
    ArrayType ({infer UnionType.types+=current} ('|' types+=ArrayType)+)?;

ArrayType infers TypeDefinition:
    ReferenceType ({infer ArrayType.elementType=current} '[' ']')? ;

ReferenceType infers TypeDefinition:
    SimpleType |
    {infer ReferenceType} '@' referenceType=SimpleType;

SimpleType infers TypeDefinition:
    '(' TypeDefinition ')' |
    {infer SimpleType} (typeRef=[AbstractType:ID] | primitiveType=PrimitiveType | stringType=STRING);

PrimitiveType returns string:
    'string' | 'number' | 'boolean' | 'Date' | 'bigint';

type AbstractType = Interface | Type | Action | ParserRule;

Type:
    'type' name=ID '=' type=TypeDefinition ';'?;

AbstractRule:
    ParserRule | TerminalRule;

GrammarImport:
    'import' path=STRING ';'?;

ParserRule:
    (entry?='entry' | fragment?='fragment')?
    RuleNameAndParams
    (wildcard?='*' | ('returns' (returnType=[AbstractType:ID] | dataType=PrimitiveType)) | inferredType=InferredType<false>)?
    (definesHiddenTokens?='hidden' '(' (hiddenTokens+=[AbstractRule:ID] (',' hiddenTokens+=[AbstractRule:ID])*)? ')')? ':'
    definition=Alternatives ';';

InferredType<imperative>:
    (<imperative> 'infer' | <!imperative> 'infers') name=ID;

fragment RuleNameAndParams:
    name=ID ('<' (parameters+=Parameter (',' parameters+=Parameter)*)? '>')?;

Parameter:
    name=ID;

Alternatives infers AbstractElement:
    ConditionalBranch ({infer Alternatives.elements+=current} ('|' elements+=ConditionalBranch)+)?;

ConditionalBranch infers AbstractElement:
    UnorderedGroup
    | {infer Group} '<' guardCondition=Disjunction '>' (elements+=AbstractToken)+;

UnorderedGroup infers AbstractElement:
    Group ({infer UnorderedGroup.elements+=current} ('&' elements+=Group)+)?;

Group infers AbstractElement:
    AbstractToken ({infer Group.elements+=current} elements+=AbstractToken+)?;

AbstractToken infers AbstractElement:
    AbstractTokenWithCardinality |
    Action;

AbstractTokenWithCardinality infers AbstractElement:
    (Assignment | AbstractTerminal) cardinality=('?'|'*'|'+')?;

Action infers AbstractElement:
    {infer Action} '{' (type=[AbstractType:ID] | inferredType=InferredType<true>) ('.' feature=FeatureName operator=('='|'+=') 'current')? '}';

AbstractTerminal infers AbstractElement:
    Keyword |
    RuleCall |
    ParenthesizedElement |
    PredicatedKeyword |
    PredicatedRuleCall |
    PredicatedGroup;

Keyword:
    value=STRING;

RuleCall:
    rule=[AbstractRule:ID] ('<' arguments+=NamedArgument (',' arguments+=NamedArgument)* '>')?;

NamedArgument:
    ( parameter=[Parameter:ID] calledByName?='=')?
    ( value=Disjunction );

LiteralCondition:
    true?='true' | 'false';

Disjunction infers Condition:
    Conjunction ({infer Disjunction.left=current} '|' right=Conjunction)*;

Conjunction infers Condition:
    Negation ({infer Conjunction.left=current} '&' right=Negation)*;

Negation infers Condition:
    Atom | {infer Negation} '!' value=Negation;

Atom infers Condition:
    ParameterReference | ParenthesizedCondition | LiteralCondition;

ParenthesizedCondition infers Condition:
    '(' Disjunction ')';

ParameterReference:
    parameter=[Parameter:ID];

PredicatedKeyword infers Keyword:
    ('=>' | '->') value=STRING;

PredicatedRuleCall infers RuleCall:
    ('=>' | '->') rule=[AbstractRule:ID] ('<' arguments+=NamedArgument (',' arguments+=NamedArgument)* '>')?;

Assignment infers AbstractElement:
    {infer Assignment} ('=>' | '->')? feature=FeatureName operator=('+='|'='|'?=') terminal=AssignableTerminal;

AssignableTerminal infers AbstractElement:
    Keyword | RuleCall | ParenthesizedAssignableElement | CrossReference;

ParenthesizedAssignableElement infers AbstractElement:
    '(' AssignableAlternatives ')';

AssignableAlternatives infers AbstractElement:
    AssignableTerminal ({infer Alternatives.elements+=current} ('|' elements+=AssignableTerminal)+)?;

CrossReference infers AbstractElement:
    {infer CrossReference} '[' type=[AbstractType] ((deprecatedSyntax?='|' | ':') terminal=CrossReferenceableTerminal )? ']';

CrossReferenceableTerminal infers AbstractElement:
    Keyword | RuleCall;

ParenthesizedElement infers AbstractElement:
    '(' Alternatives ')';

PredicatedGroup infers Group:
    ('=>' | '->') '(' elements+=Alternatives ')';

ReturnType:
    name=(PrimitiveType | ID);

TerminalRule:
    hidden?='hidden'? 'terminal' (fragment?='fragment' name=ID | name=ID ('returns' type=ReturnType)?) ':'
        definition=TerminalAlternatives
    ';';

TerminalAlternatives infers AbstractElement:
    TerminalGroup ({infer TerminalAlternatives.elements+=current} '|' elements+=TerminalGroup)*;

TerminalGroup infers AbstractElement:
    TerminalToken ({infer TerminalGroup.elements+=current} elements+=TerminalToken+)?;

TerminalToken infers AbstractElement:
    TerminalTokenElement cardinality=('?'|'*'|'+')?;

TerminalTokenElement infers AbstractElement:
    CharacterRange | TerminalRuleCall | ParenthesizedTerminalElement | NegatedToken | UntilToken | RegexToken | Wildcard;

ParenthesizedTerminalElement infers AbstractElement:
    '(' (lookahead=('?='|'?!'))? TerminalAlternatives ')';

TerminalRuleCall infers AbstractElement:
    {infer TerminalRuleCall} rule=[TerminalRule:ID];

NegatedToken infers AbstractElement:
    {infer NegatedToken} '!' terminal=TerminalTokenElement;

UntilToken infers AbstractElement:
    {infer UntilToken} '->' terminal=TerminalTokenElement;

RegexToken infers AbstractElement:
    {infer RegexToken} regex=RegexLiteral;

Wildcard infers AbstractElement:
    {infer Wildcard} '.';

CharacterRange infers AbstractElement:
    {infer CharacterRange} left=Keyword ('..' right=Keyword)?;

FeatureName returns string:
    'current' | 'entry' | 'extends' | 'false' | 'fragment' | 'grammar' | 'hidden' | 'import' | 'interface' | 'returns' | 'terminal' | 'true' | 'type' | 'infer' | 'infers' | 'with' | PrimitiveType | ID;

terminal ID: /\\^?[_a-zA-Z][\\w_]*/;
//terminal STRING: /"(\\\.|[^"\\\])*"|'(\\\.|[^'\\\])*'/;
terminal STRING: /TEMP/;
terminal RegexLiteral returns string: /\\/(?![*+?])(?:[^\\r\\n\\[/\\\]|\\\.|\\[(?:[^\\r\\n\]\\\]|\\\.)*\\])+\\//;

hidden terminal WS: /\\s+/;
hidden terminal ML_COMMENT: /\\/\\*[\\s\\S]*?\\*\\//;
hidden terminal SL_COMMENT: /\\/\\/[^\\n\\r]*/;
        

        `;
        const response: UserConfig = await this.createUserConfig(text, document.getElementById('leftroot')!);
        this.setState({ asyncUserConfig: response });
    }

    /**
     * Generates a UserConfig for a Langium grammar example, which is then passed to the monaco component
     * 
     * @param code Program text to start with
     * @param htmlElement Element to bind the editor to
     * @returns A completed UserConfig
     */
    async createUserConfig(code: string, htmlElement: HTMLElement): Promise<UserConfig> {

        // setup extension files/contents
        const extensionFilesOrContents = new Map<string, string | URL>();
        const configUrl = new URL('/ls/langium-configuration.json', window.location.href);
        const grammarUrl = new URL('/ls/langium-grammar.json', window.location.href);

        extensionFilesOrContents.set('/langium-configuration.json', configUrl);
        extensionFilesOrContents.set('/langium-grammar.json', await (await fetch(grammarUrl)).text());

        // Language Server preparation
        const workerUrl = new URL('/ls/langiumServerWorker.js', window.location.href);

        // generate langium config
        return {
            htmlElement,
            wrapperConfig: {
                useVscodeConfig: true,
                serviceConfig: {
                    enableThemeService: true,
                    enableTextmateService: true,
                    enableModelEditorService: true,
                    modelEditorServiceConfig: {
                        useDefaultFunction: true
                    },
                    enableConfigurationService: true,
                    configurationServiceConfig: {
                        defaultWorkspaceUri: '/tmp/'
                    },
                    enableKeybindingsService: true,
                    enableLanguagesService: true,
                    debugLogging: true
                },
                monacoVscodeApiConfig: {
                    extension: {
                        name: 'langium',
                        publisher: 'typefox',
                        version: '1.0.0',
                        engines: {
                            vscode: '*'
                        },
                        contributes: {
                            languages: [{
                                id: 'langium',
                                extensions: [
                                    '.langium'
                                ],
                                aliases: [
                                    'langium',
                                    'Langium'
                                ],
                                configuration: './langium-configuration.json'
                            }],
                            grammars: [{
                                language: 'langium',
                                scopeName: 'source.langium',
                                path: './langium-grammar.json'
                            }],
                            keybindings: [{
                                key: 'ctrl+p',
                                command: 'editor.action.quickCommand',
                                when: 'editorTextFocus'
                            }, {
                                key: 'ctrl+shift+c',
                                command: 'editor.action.commentLine',
                                when: 'editorTextFocus'
                            }]
                        }
                    },
                    extensionFilesOrContents,
                    userConfiguration: {
                        json: `{
    "workbench.colorTheme": "Default Dark+ Experimental",
    "editor.fontSize": 14,
    "editor.lightbulb.enabled": true,
    "editor.lineHeight": 20,
    "editor.guides.bracketPairsHorizontal": "active",
    "editor.lightbulb.enabled": true
  }`
                    }
                }
            },
            editorConfig: {
                languageId: 'langium',
                code,
                useDiffEditor: false,
                automaticLayout: true,
                theme: 'vs-dark',
            },
            languageClientConfig: {
                enabled: true,
                useWebSocket: false,
                workerConfigOptions: {
                    url: workerUrl,
                    type: 'module',
                    name: 'LS',
                }
            }
        };
    }

    /**
   * Callback that is invoked when Monaco is finished loading up.
   * Can be used to safely register notification listeners, retrieve data, and the like
   *
   * @throws Error on inability to ref the Monaco component or to get the language client
   */
    onMonacoLoad() {
        // verify we can get a ref to the editor
        if (!this.monacoEditor.current) {
            throw new Error("Unable to get a reference to the Monaco Editor");
        }

        // verify we can get a ref to the language client
        const lc = this.monacoEditor.current
            ?.getEditorWrapper()
            ?.getLanguageClient();
        if (!lc) {
            throw new Error("Could not get handle to Language Client on mount");
        }

        // register to receive DocumentChange notifications
        lc.onNotification("browser/DocumentChange", this.onDocumentChange);
    }

    /**
     * Callback invoked when the document processed by the LS changes
     * Invoked on startup as well
     * @param resp Response data
     */
    onDocumentChange(resp: DocumentChangeResponse) {
        // decode the received Ast
        const ast = deserializeAST(resp.content);
        const graph = convertASTtoGraph(ast);
        const dot = convertGraphtoDOT(graph);
        this.setState({ graph: dot });
    }

    render() {

        if (this.state.asyncUserConfig.editorConfig === undefined) {
            return (<div>loading...</div>);
        }

        // otherwise setup normally
        const style = {
            paddingTop: "5px",
            height: "100%",
            width: "100%"
        };

        const graphOptions = {
            layout: {
                hierarchical: false,
            },
            edges: {
                color: '#000000',
            },
        };

        const graphVizOptions = {
            fit: true,
            width: '100%',
            height: '100vh',
            zoom: true
        };

        return (
            <>
                <style ref="../../@typefox/monaco-editor-react/bundle/assets/style.css" />
                <div className="left" id="leftroot">
                    <MonacoEditorReactComp
                        ref={this.monacoEditor}
                        userConfig={this.state.asyncUserConfig}
                        onLoad={this.onMonacoLoad}
                        style={style} />
                </div>
                <div className="right">
                    {this.state.graph && <Graphviz dot={this.state.graph} options={graphVizOptions} />}
                    {/* {this.state.treemapData && <Treemap
                    {...{
                        animation: true,
                        colorType: 'literal',
                        colorRange: ['#88572C'],
                        renderMode: 'DOM',
                        width: 1200,
                        height: 1200,
                        data: this.state.treemapData, 
                        // mode: 'circlePack',
                        // mode: 'squarify',
                        // mode: 'partition',
                        mode: 'partition-pivot',
                        // mode: 'binary',
                        style: {
                        stroke: '#fff',
                        strokeWidth: '1',
                        strokeOpacity: 1,
                        border: 'thin solid #fff'
                        }
                    }}
                    />} */}
                </div>
            </>
        );
    }
}

export default LangiumGrammarVisualizer;