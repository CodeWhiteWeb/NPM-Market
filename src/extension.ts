import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import axios from 'axios';
import { getInstalledPackages, searchNpm } from './routes';
export function activate(context: vscode.ExtensionContext) {
  const provider = new NpmMarketProvider(context.extensionUri, context); 
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(NpmMarketProvider.viewType, provider)
  );
}


class NpmMarketProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'npmMarketView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly extensionContext: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _resolveContext: vscode.WebviewViewResolveContext, // renamed to avoid confusion
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = getWebviewContent(webviewView.webview, this.extensionUri);

    getInstalledPackages().then((packages) => {
      webviewView.webview.postMessage({
        command: 'installedPackages',
        packages,
      });
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'getInstalledPackages') {
        const packages = await getInstalledPackages();
        webviewView.webview.postMessage({
          command: 'installedPackages',
          packages,
        });
      } else if (message.command === 'search') {
        const results = await searchNpm(message.text, message.page || 0, 10);
        webviewView.webview.postMessage({
          command: 'searchResults',
          results,
          page: message.page || 0,
        });
      } else if (message.command === 'openPackage') {
        openPackageWebview(this.extensionContext, message.name); // ✅ use correct context here
      }
    });
  }
}


function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'scripts.js'));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'styles.css'));
  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="${styleUri}" rel="stylesheet">
</head>
<body>
  <div class="search">
    <input id="searchBox" placeholder="Search NPM packages..." />
  </div>
  <div class="list" id="packageList"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export async function openPackageWebview(context: vscode.ExtensionContext, pkgName: string) {
  const panel = vscode.window.createWebviewPanel(
    'npmPackageDetail',
    `Package: ${pkgName}`,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))],
    }
  );

  const mediaPath = vscode.Uri.file(path.join(context.extensionPath, 'media'));
  const htmlPath = vscode.Uri.file(path.join(mediaPath.fsPath, 'package.html'));

  let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');
  const scriptUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath.fsPath, 'package.js')));
  const styleUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(mediaPath.fsPath, 'package.css')));
  const markedUri = panel.webview.asWebviewUri(vscode.Uri.file(require.resolve('marked/marked.min.js')));
  const nonce = getNonce();

  // Inject proper CSP and script/style URIs
  html = html
    .replace('package.css', `${styleUri}" nonce="${nonce}`)
    .replace('package.js', `${scriptUri}" nonce="${nonce}`)
    .replace('</head>', `
      <meta http-equiv="Content-Security-Policy" content="
        default-src 'none';
        img-src https:;
        script-src 'nonce-${nonce}' https://cdnjs.cloudflare.com;
        style-src 'nonce-${nonce}';
        font-src https:;
        connect-src https:;
        ">
      </head>`)
    .replace('</body>', `<script nonce="${nonce}" src="${markedUri}"></script></body>`);

  panel.webview.html = html;

  // Fetch metadata
  try {
    const [metaRes, downloadRes] = await Promise.all([
      axios.get(`https://registry.npmjs.org/${pkgName}`),
      axios.get(`https://api.npmjs.org/downloads/point/last-week/${pkgName}`)
    ]);

    const meta = metaRes.data;
    const latestVersion = meta['dist-tags'].latest;
    const versionData = meta.versions[latestVersion];

    const metadata = {
      name: meta.name,
      repository: versionData.repository?.url?.replace(/^git\+/, '')?.replace(/\.git$/, '') || '',
      homepage: versionData.homepage || '',
      downloads: downloadRes.data.downloads,
      version: latestVersion,
      license: versionData.license || '',
      lastPublish: meta.time[latestVersion],
      collaborators: meta.maintainers?.map((m: any) => m.name) || [],
    };

    const readme = meta.readme || 'Unable to load README';
    panel.webview.postMessage({ metadata, readme });
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to load package details for ${pkgName}`);
    console.error(err);
  }
}
