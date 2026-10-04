// Chargé par une balise <script type="module"> depuis les écrans de match du jeu.
// Un module servi depuis public/ ne s'importe pas depuis le code empaqueté :
// la balise le charge tel quel, et la scène est remise à l'hôte par cet objet.
import * as scene from './scene.js';
globalThis.__destinyRugbyScene3D=scene;
globalThis.dispatchEvent(new Event('destiny-scene3d'));
