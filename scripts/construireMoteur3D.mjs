import { build } from 'vite';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const game=process.cwd();
await build({configFile:false,publicDir:false,logLevel:'warn',
  build:{outDir:path.resolve(game,'../analyse-rn26/apercu/match'),emptyOutDir:false,minify:true,
    lib:{entry:path.resolve(game,'src/lib/moteur/passerelle3D.ts'),formats:['es'],fileName:()=> 'moteur-destiny.js'},
    rolldownOptions:{treeshake:{moduleSideEffects:false}}
  }
});
const installed = spawnSync(process.execPath, ['installer_apercu.mjs'], {
  cwd: path.resolve(game, '../analyse-rn26'), stdio: 'inherit',
});
if (installed.status !== 0) throw new Error('Installation de l’aperçu 3D échouée');
