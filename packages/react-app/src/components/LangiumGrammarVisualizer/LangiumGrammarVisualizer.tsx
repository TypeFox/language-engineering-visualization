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
        const text = `grammar Statemachine

entry Statemachine:
    'statemachine' name=ID
    ('events' events+=Event+)?
    ('commands'    commands+=Command+)?
    'initialState' init=[State]
    states+=State*;

Event:
    name=ID;

Command:
    name=ID;

State:
    'state' name=ID
        ('actions' '{' actions+=[Command]+ '}')?
        transitions+=Transition*
    'end';

Transition:
    event=[Event] '=>' state=[State];

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
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