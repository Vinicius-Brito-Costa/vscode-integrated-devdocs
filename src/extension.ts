import * as vscode from 'vscode';

const EXT_NAME = "intdevdocs";
const TAB_NAME = "IntDevdocs.io";
const IFRAME_UPDATE_MESSAGE = "UPDATE_MESSAGE";
const URL = 'https://devdocs.io';
const ICON_PATH = "https://raw.githubusercontent.com/Vinicius-Brito-Costa/vscode-integrated-devdocs/refs/heads/main/src/assets/icon.png";
const PARSED: Record<string, string> = {
    "shellscript": "bash"
};

enum CONFIG_PARAM {
    URL
}

function getParam(param: CONFIG_PARAM): string {
    switch (param){
        case CONFIG_PARAM.URL:
            return _get_param("url");
        default:
            return "";
    }
}

function _get_param(name: string): string {
    const param: string | undefined = vscode.workspace.getConfiguration(EXT_NAME).get(name);
    if (param) {
        return param;
    }
    return "";
}

let currentPanel: vscode.WebviewPanel | undefined = undefined;
function createWebview(uri: vscode.Uri): vscode.WebviewPanel{
    const panel = vscode.window.createWebviewPanel(
        TAB_NAME,
        TAB_NAME,
        vscode.ViewColumn.Two,
        {
            enableScripts: true
        }
    );

    panel.webview.html = `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, height=device-height, initial-scale=1.0">
                <title>${TAB_NAME}</title>

                <link rel="icon" href="${ICON_PATH}" type="image/x-icon">
                <link rel="shortcut icon" href="${ICON_PATH}" type="image/x-icon">
                <link rel="apple-touch-icon" href="${ICON_PATH}">

                <script>
                    const vscode = acquireVsCodeApi(); // Get the VS Code API for the webview

                    window.addEventListener('message', event => {
                        const message = event.data; // The JSON data sent from the extension

                        switch (message.command) {
                            case '${IFRAME_UPDATE_MESSAGE}':
                                document.getElementById('iframe-data').src = message.text;
                                break;
                            default:
                                break;
                        }
                    });
                </script>
            </head>
            <body>
                <iframe id="iframe-data" src="${uri}" style="width:100%; height:100vh; border:none;"></iframe>
            </body>
        </html>
    `;
    return panel;
}
function getDevDocLanguagueName(lang: string | undefined): string | undefined {
    if (!lang) {return lang;}
    return PARSED[lang] ? PARSED[lang] : lang;
}

export function activate(context: { subscriptions: vscode.Disposable[]; }) {
    if (!context){
        return;
    }
    const disposable = vscode.commands.registerCommand('extension.intdevdocs', args => {
        if(!args){
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }

        let text = "";

        const selection: vscode.Selection = editor.selection;
        if (!selection.isEmpty) {
            text = editor.document.getText(selection);
        } else {
            const position = editor.selection.active;
            const range = editor.document.getWordRangeAtPosition(position);
            text = editor.document.getText(range);
        }

        if (text.indexOf('\n') >= 0 || text.length == 0) {
          vscode.window.showErrorMessage(`[${TAB_NAME}]: Invalid selection.`);
          return;
        }

        let lang = vscode.window.activeTextEditor?.document.languageId;
        lang = getDevDocLanguagueName(lang);
        
        if (lang) {
            const customUrl = getParam(CONFIG_PARAM.URL);
            const uri = vscode.Uri.parse((customUrl.length > 0 ? customUrl : URL) + "#q=" + (lang ? lang + " " : "") + text);
            if (!currentPanel){
                currentPanel = createWebview(uri);
                currentPanel.onDidDispose(() => {
                    currentPanel = undefined;
                }, null, context.subscriptions);
            } else {
                currentPanel.webview.postMessage({ command: IFRAME_UPDATE_MESSAGE, text: uri.toString() });
            }
        }
   });
    context.subscriptions.push(disposable);
};
