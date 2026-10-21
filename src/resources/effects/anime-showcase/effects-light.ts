import { drawKutsunaLightning } from './kutsuna-lightning.js';
import { drawKanadaLight } from './kanada-light.js';
import {
  drawKanadaBeamSprites,
  drawKanadaDragonSprites,
} from './kanada-sprite-effects.js';
import {
  drawArakiSprites,
  drawTatsuzoSprites,
} from './effects-drawn-impact.js';
import { drawKozumaSprites } from './effects-kozuma.js';
import { drawShigetaSprites } from './effects-shigeta.js';
import type { Context, Frame } from './types.js';
export {
  sampleKanadaBeam,
  drawKanadaBeamSprites as drawKanadaBeam,
} from './kanada-sprite-effects.js';

export function drawLightEffects(
  ctx: Context,
  id: string,
  frame: Frame,
): boolean {
  if (id === 'fx-kanada-light') drawKanadaLight(ctx, frame);
  else if (id === 'fx-kanada-beam') drawKanadaBeamSprites(ctx, frame);
  else if (id === 'fx-kanada-dragon') drawKanadaDragonSprites(ctx, frame);
  else if (id === 'fx-araki') drawArakiSprites(ctx, frame);
  else if (id === 'fx-kozuma') drawKozumaSprites(ctx, frame);
  else if (id === 'fx-tatsuzo') drawTatsuzoSprites(ctx, frame);
  else if (id === 'fx-shigeta') drawShigetaSprites(ctx, frame);
  else if (id === 'fx-kutsuna') drawKutsunaLightning(ctx, frame);
  else return false;
  return true;
}
