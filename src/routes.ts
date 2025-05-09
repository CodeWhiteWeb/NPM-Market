import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export async function getInstalledPackages(): Promise<any[]> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return [];

  const packageJsonPath = path.join(folders[0].uri.fsPath, 'package.json');

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    const json = JSON.parse(raw);
    const dependencies = {
      ...json.dependencies,
      ...json.devDependencies,
    };

    const result = await Promise.all(
      Object.keys(dependencies).map(async (pkg) => {
        const metadata = await fetchPackageDetails(pkg);
        const downloads = await getDownloadCount(pkg);
        return {
          ...metadata,
          downloads,
        };
      })
    );

    return result;
  } catch (err) {
    console.error('Error reading package.json:', err);
    return [];
  }
}

function rankPackage(pkg: any, query: string): number {
  const name = pkg.name.toLowerCase();
  const description = (pkg.description || '').toLowerCase();
  const q = query.toLowerCase();

  let score = 0;
  if (name === q) score += 100;
  else if (name.startsWith(q)) score += 75;
  else if (name.includes(q)) score += 50;
  if (description.includes(q)) score += 25;

  return score;
}

function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return `${count}`;
}

async function getDownloadCount(pkgName: string): Promise<string> {
  try {
    const response = await axios.get(`https://api.npmjs.org/downloads/point/last-month/${pkgName}`);
    return formatDownloads(response.data.downloads || 0);
  } catch (error) {
    console.error(`Error fetching download count for ${pkgName}:`, error);
    return '0';
  }
}

export async function searchNpm(query: string, page: number = 0, size: number = 10): Promise<any[]> {
  if (!query) return [];

  try {
    const response = await axios.get(`https://registry.npmjs.org/-/v1/search`, {
      params: {
        text: query,
        size: size * (page + 1),
      },
    });

    const enrichedResults = await Promise.all(
      response.data.objects.map(async (obj: any) => {
        const pkg = obj.package;
        const downloads = await getDownloadCount(pkg.name);
        return {
          name: pkg.name,
          description: pkg.description,
          version: pkg.version,
          keywords: pkg.keywords,
          repository: pkg.repository,
          downloads,
        };
      })
    );

    return enrichedResults
      .map(pkg => ({
        ...pkg,
        score: rankPackage(pkg, query),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(page * size, (page + 1) * size);

  } catch (error) {
    console.error('Error fetching NPM search:', error);
    return [];
  }
}

async function fetchPackageDetails(pkgName: string): Promise<any> {
  try {
    const res = await axios.get(`https://registry.npmjs.org/${pkgName}`);
    return {
      name: res.data.name,
      description: res.data.description || '',
    };
  } catch (err) {
    console.error(`Error fetching metadata for ${pkgName}:`, err);
    return { name: pkgName, description: '' };
  }
}
