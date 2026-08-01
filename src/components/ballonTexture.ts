import * as THREE from 'three';
import type { SkinBallon } from '../data/boutique';

// Fabrique une texture peinte façon ballon Gilbert France Rugby et la mappe sur
// l'ellipsoïde : u (horizontal) = tour du ballon, v (vertical) = pointe à pointe.
export function makeBallonTexture(skin: SkinBallon): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;

  // Corps blanc
  ctx.fillStyle = skin.corps;
  ctx.fillRect(0, 0, W, H);

  // Pointes colorées festonnées (haut = une extrémité, bas = l'autre)
  const capH = 104;
  const cap = (top: boolean) => {
    ctx.fillStyle = skin.bande;
    ctx.beginPath();
    if (top) {
      ctx.moveTo(0, 0);
      ctx.lineTo(W, 0);
      for (let x = W; x >= 0; x -= 6) ctx.lineTo(x, capH + Math.sin(x / 26) * 14);
    } else {
      ctx.moveTo(0, H);
      ctx.lineTo(W, H);
      for (let x = W; x >= 0; x -= 6) ctx.lineTo(x, H - capH + Math.sin(x / 26) * 14);
    }
    ctx.closePath();
    ctx.fill();
  };
  cap(true);
  cap(false);

  // Double swoosh qui balaie le ballon (rouge + bleu), bouclé pour un raccord net
  const swoosh = (yBase: number, amp: number, width: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let x = 0; x <= W; x += 4) {
      const y = yBase + Math.sin((x / W) * Math.PI * 2) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  // au-dessus de l'équateur : rouge épais + bleu fin ; miroir en dessous
  swoosh(178, 30, 26, skin.lisere);
  swoosh(150, 30, 10, skin.bande);
  swoosh(H - 178, 30, 26, skin.lisere);
  swoosh(H - 150, 30, 10, skin.bande);

  // Coutures des 4 panneaux (verticales, pointe à pointe) + points de suture
  const seams = [0.125, 0.375, 0.625, 0.875].map((f) => f * W);
  ctx.strokeStyle = skin.couture;
  for (const sx of seams) {
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, H);
    ctx.stroke();
    ctx.lineWidth = 2;
    for (let y = 12; y < H; y += 16) {
      ctx.beginPath();
      ctx.moveTo(sx - 6, y);
      ctx.lineTo(sx + 6, y);
      ctx.stroke();
    }
  }

  // Motif Équipe de France sur le panneau central
  if (skin.france) {
    dessinerCoq(ctx, W / 2, H / 2 - 18, skin.lisere);
    ctx.fillStyle = skin.bande;
    ctx.textAlign = 'center';
    ctx.font = '700 30px Archivo, sans-serif';
    ctx.fillText('FRANCE', W / 2 + 96, H / 2 + 4);
    ctx.fillText('RUGBY', W / 2 + 96, H / 2 + 36);
    // Marque façon Gilbert vers une pointe
    ctx.fillStyle = skin.couture;
    ctx.font = '800 26px Anton, sans-serif';
    ctx.fillText('GILBERT', W / 2, H - 150);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

// Coq stylisé (silhouette) — approximation vectorielle de l'emblème.
function dessinerCoq(ctx: CanvasRenderingContext2D, cx: number, cy: number, couleur: string) {
  ctx.save();
  ctx.translate(cx - 70, cy);
  ctx.fillStyle = couleur;
  ctx.beginPath();
  // corps
  ctx.moveTo(0, 10);
  ctx.bezierCurveTo(-6, -22, 22, -40, 34, -20); // dos vers la tête
  ctx.bezierCurveTo(40, -30, 46, -30, 44, -18); // crête
  ctx.bezierCurveTo(52, -20, 52, -12, 44, -10); // bec
  ctx.bezierCurveTo(50, -2, 44, 4, 36, 2); // caroncule
  ctx.bezierCurveTo(40, 16, 30, 26, 16, 24); // poitrine
  ctx.bezierCurveTo(20, 34, 14, 40, 8, 34); // patte 1
  ctx.lineTo(6, 26);
  ctx.bezierCurveTo(0, 40, -8, 40, -6, 28); // patte 2
  ctx.bezierCurveTo(-22, 26, -34, 12, -24, -2); // arrière-corps
  // queue en plumes
  ctx.bezierCurveTo(-44, -6, -52, -28, -34, -30);
  ctx.bezierCurveTo(-40, -44, -22, -44, -20, -28);
  ctx.bezierCurveTo(-10, -34, -2, -26, -4, -14);
  ctx.closePath();
  ctx.fill();
  // œil (trou blanc)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(34, -18, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
