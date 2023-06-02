/******************************************************************************
 * Copyright 2022 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { DocumentState, startLanguageServer, EmptyFileSystem, createLangiumGrammarServices } from 'langium';
import { BrowserMessageReader, BrowserMessageWriter, createConnection, NotificationType, Diagnostic } from 'vscode-languageserver/browser';

/* browser specific setup code */
const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Inject the shared services and language-specific services
const { shared, grammar } = createLangiumGrammarServices({ connection, ...EmptyFileSystem });

// by pass other messages that are required to make the playground work
type DocumentChange = { uri: string, content: string, diagnostics: Diagnostic[] };
const documentChangeNotification = new NotificationType<DocumentChange>('browser/DocumentChange');
const jsonSerializer = grammar.serializer.JsonSerializer;
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, (documents) => {
    for (const document of documents) {
        const json = jsonSerializer.serialize(document.parseResult.value);
        connection.sendNotification(documentChangeNotification, {
            uri: document.uri.toString(),
            content: json,
            diagnostics: document.diagnostics ?? []
        });
    }
    return Promise.resolve();
});

// Start the language server with the shared services
startLanguageServer(shared);