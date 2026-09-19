import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projet = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(projet, '..', 'sprite et sprite generator', 'src');
const destination = path.join(projet, 'src', 'lib', 'spritesGenerateur');
const fichiers = ['models.ts', 'engine.ts', 'renderer.ts', 'rugbyAnimations.ts'];

await fs.mkdir(destination, { recursive: true });
for (const fichier of fichiers) {
  let contenu = await fs.readFile(path.join(source, fichier), 'utf8');
  // Le jeu active les règles TypeScript strictes `verbatimModuleSyntax` et
  // `erasableSyntaxOnly`. Ces retouches ne changent pas le rendu du générateur :
  // elles séparent seulement les imports de types et développent un raccourci TS.
  if (fichier === 'engine.ts') {
    contenu = contenu
      .replace(
        /import \{\r?\n  AnimationClip, BoneId, BodyProportions, Character, JointId, ProjectData, SkeletonPose, Vec2,\r?\n  BONE_IDS, clone\r?\n\} from '\.\/models'/,
        "import { BONE_IDS, clone } from './models'\nimport type {\n  AnimationClip, BoneId, BodyProportions, Character, JointId, ProjectData, SkeletonPose, Vec2\n} from './models'",
      )
      .replace(
        'constructor(private limit = 80) {}',
        'private limit: number\n  constructor(limit = 80) { this.limit = limit }',
      );
  }
  if (fichier === 'renderer.ts') {
    contenu = contenu
      .replace("import { Character, JointId, SkeletonPose, Vec2 } from './models'", "import type { Character, JointId, SkeletonPose, Vec2 } from './models'")
      .replace("import { SkeletonResult, computeSkeleton } from './engine'", "import { computeSkeleton } from './engine'\nimport type { SkeletonResult } from './engine'");
  }
  if (fichier === 'rugbyAnimations.ts') {
    contenu = contenu.replace(
      "import { AnimationClip, BallAttachment, Character, ProjectData, SkeletonPose, clone, createFrame, createRestPose } from './models'",
      "import { clone, createFrame, createRestPose } from './models'\nimport type { AnimationClip, BallAttachment, Character, ProjectData, SkeletonPose } from './models'",
    );
  }
  await fs.writeFile(path.join(destination, fichier), contenu);
}
console.log(`${fichiers.length} modules du générateur synchronisés dans src/lib/spritesGenerateur.`);
