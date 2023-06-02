import './StateMachineVisualizer.css';
import { MonacoEditorReactComp } from '@typefox/monaco-editor-react';
import { UserConfig } from 'monaco-editor-wrapper';
import React, { createRef } from 'react';
import { DocumentChangeResponse, LangiumAST } from '../../../../langium-hat/dist';
import { Graphviz } from 'graphviz-react';

interface StateMachineVisualizerState {
    asyncUserConfig: UserConfig;
    graph: any;
}
// Class that extends a react component with a render method
export class StateMachineVisualizer extends React.Component<{}, StateMachineVisualizerState> {

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
        const text = `// Create your own statemachine here!
statemachine TrafficLight

events
switchCapacity
next

initialState PowerOff

state PowerOff
switchCapacity => RedLight
end

state RedLight
switchCapacity => PowerOff
next => GreenLight
end

state YellowLight
switchCapacity => PowerOff
next => RedLight
end

state GreenLight
switchCapacity => PowerOff
next => YellowLight
end`;
        const response: UserConfig = await this.createStatemachineConfig(text, document.getElementById('leftroot')!);
        this.setState({ asyncUserConfig: response });
    }

    /**
     * Generates a userconfig for the Statemachine example, which is passed to the monaco componnent
     * 
     * @param code Program text to start with
     * @param htmlElement Element to bind the editor to
     * @returns A completed userconfig
     */
    async createStatemachineConfig(code: string, htmlElement: HTMLElement): Promise<UserConfig> {

        // setup extension files/contents
        const extensionFilesOrContents = new Map<string, string | URL>();
        const configUrl = new URL('/ls/statemachine-configuration.json', window.location.href);
        const grammarUrl = new URL('/ls/statemachine-grammar.json', window.location.href);

        extensionFilesOrContents.set('/statemachine-configuration.json', configUrl);
        extensionFilesOrContents.set('/statemachine-grammar.json', await (await fetch(grammarUrl)).text());

        // Language Server preparation
        const workerUrl = new URL('/ls/statemachineServerWorker.js', window.location.href);

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
                        name: 'statemachine',
                        publisher: 'typefox',
                        version: '1.0.0',
                        engines: {
                            vscode: '*'
                        },
                        contributes: {
                            languages: [{
                                id: 'statemachine',
                                extensions: [
                                    '.statemachine'
                                ],
                                aliases: [
                                    'statemachine',
                                    'Statemachine'
                                ],
                                configuration: './statemachine-configuration.json'
                            }],
                            grammars: [{
                                language: 'statemachine',
                                scopeName: 'source.statemachine',
                                path: './statemachine-grammar.json'
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
                languageId: 'statemachine',
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
        const astUtils = new LangiumAST();
        const ast = astUtils.deserializeAST(resp.content);
        const graph = astUtils.astToGraph(ast);
        const dot = astUtils.graphToDOT(graph);
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

          let graphPart = <div>loading...</div>;
          if (this.state.graph !== undefined) {
            // replace with the actual graph
            graphPart = <Graphviz dot={this.state.graph} options={graphVizOptions} />;
          }

        return (
            <>
                <style ref="../../@typefox/monaco-editor-react/bundle/assets/style.css"/>
                <div className="left" id="leftroot">
                    <MonacoEditorReactComp
                        ref={this.monacoEditor}
                        userConfig={this.state.asyncUserConfig}
                        onLoad={this.onMonacoLoad}
                        style={style} />
                </div>
                <div className="right">
                {graphPart}
                </div>
            </>
        );
    }
}

export default StateMachineVisualizer;