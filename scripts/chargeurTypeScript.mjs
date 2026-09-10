// Chargeur minimal de secours quand le lanceur npm/npx local est indisponible.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export async function resolve(specifier, context, nextResolve) {
  try { return await nextResolve(specifier, context); }
  catch (erreur) {
    if (!specifier.startsWith('.') || !context.parentURL) throw erreur;
    const brut = fileURLToPath(new URL(specifier, context.parentURL));
    const candidats = specifier.endsWith('.js')
      ? [brut.slice(0, -3) + '.ts', brut.slice(0, -3) + '.tsx']
      : [`${brut}.ts`, `${brut}.tsx`, `${brut}/index.ts`];
    const fichier = candidats.find(existsSync);
    if (!fichier) throw erreur;
    return { url: pathToFileURL(fichier).href, shortCircuit: true };
  }
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith('.ts') && !url.endsWith('.tsx')) return nextLoad(url, context);
  const resultat = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      verbatimModuleSyntax: true,
    },
    fileName: fileURLToPath(url),
  });
  return { format: 'module', source: resultat.outputText, shortCircuit: true };
}
