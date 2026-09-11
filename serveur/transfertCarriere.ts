import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';

/** Pages immuables : ajouter une transaction ne retransfère pas tout le journal. */
export interface BlocTransfert { cle: string; empreinte: string; contenu: string }
export interface ManifestTransfert { format: 1; champs: Record<string, string[]>; empreintes: Record<string, string> }
export function encoderTransfert(etat: object) {
  const manifest: ManifestTransfert = { format: 1, champs: {}, empreintes: {} };
  const blocs: BlocTransfert[] = [];
  for (const [champ, valeur] of Object.entries(etat)) {
    if (valeur === undefined) continue;
    const pages = Array.isArray(valeur)
      ? Array.from({ length: Math.ceil(valeur.length / 128) }, (_, i) => valeur.slice(i * 128, (i + 1) * 128))
      : [valeur];
    const cles = pages.map((page, i) => {
      const cle = `${champ}:${Array.isArray(valeur) ? i : 'objet'}`;
      const json = JSON.stringify(page);
      const empreinte = createHash('sha256').update(json).digest('hex');
      manifest.empreintes[cle] = empreinte;
      blocs.push({ cle, empreinte, contenu: gzipSync(json).toString('base64') });
      return cle;
    });
    manifest.champs[champ] = cles;
  }
  return { manifest, blocs };
}
export function decoderBloc(bloc: BlocTransfert): unknown {
  const json = gunzipSync(Buffer.from(bloc.contenu, 'base64'), { maxOutputLength: 64 * 1024 * 1024 }).toString('utf8');
  if (createHash('sha256').update(json).digest('hex') !== bloc.empreinte) throw new Error('Bloc de ligue corrompu');
  return JSON.parse(json);
}
export function assemblerTransfert(manifest: ManifestTransfert, lire: (cle: string, empreinte: string) => unknown): object {
  if (manifest.format !== 1) throw new Error('Format de transfert inconnu');
  return Object.fromEntries(Object.entries(manifest.champs).map(([champ, cles]) => [champ,
    cles.length === 1 && cles[0].endsWith(':objet')
      ? lire(cles[0], manifest.empreintes[cles[0]])
      : cles.flatMap(cle => lire(cle, manifest.empreintes[cle]) as unknown[]),
  ]));
}
