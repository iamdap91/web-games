import { redirectToStudio } from '../studio/bridge.js';
import { mountCutscene } from '../shared/screen.js';
import { loadSceneAssets } from './assets.js';
import { drawScene } from './drawing.js';
import { rushPreset } from './preset-rush.js';
import { sampleFinaleFormation } from './finale-formation.js';
import {
  finaleShot,
  finaleSourceStartMs,
  samplePresentedRush,
} from './finale-timing.js';
import { cuts, prisonStartMs } from './timeline.js';

if (!redirectToStudio('ataho-shadow')) {
  mountCutscene({
    studio: {
      source: 'ataho-shadow',
      title: '암중호격',
      description: '고요한 시선. 어둠 속 공방. 한 번의 결산.',
    },
    cuts,
    gif: { fileName: 'ataho-shadow-cutscene' },
    load: loadSceneAssets,
    draw: drawScene,
    action: (snapshot) => {
      if (snapshot.cut.id === 'ending')
        return '정적 뒤 본체 공개 · 기존 등 뒤 원화';
      if (snapshot.elapsedMs < prisonStartMs || snapshot.cut.id === 'return')
        return '';
      const timeMs = snapshot.elapsedMs - prisonStartMs;
      const rush = samplePresentedRush(timeMs);
      if (timeMs < finaleSourceStartMs)
        return `${rushPreset.name} · 배경 분신0 · ${rush.finisher.beat.label} · ${rush.hitCount}/${rush.totalHits}명중 · ${rush.snapshot.step.phase}`;
      const formation = sampleFinaleFormation(timeMs - finaleSourceStartMs, {
        reducedMotion: false,
      });
      const visible = formation.actors.filter((actor) => actor.opacity > 0.01);
      const colored = visible.filter((actor) => actor.colorMix > 0.01);
      const attacks = new Set(visible.map((actor) => actor.attack));
      return `순옥살 · ${rush.hitCount}/${rush.totalHits}명중 · ${finaleShot(timeMs)} · 표시${visible.length}/7 · 원색${colored.length} · 공격${attacks.size}종 · 정권·킥·어퍼컷`;
    },
  });
}
