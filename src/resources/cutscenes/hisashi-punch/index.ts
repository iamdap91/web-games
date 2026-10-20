import { redirectToStudio } from '../studio/bridge.js';
import { mountCutscene } from '../shared/screen.js';
import { loadAssets } from './assets.js';
import { drawScene } from './drawing.js';
import { cuts, samplePunch } from './timeline.js';

if (!redirectToStudio('hisashi-punch')) {
  mountCutscene({
    studio: {
      source: 'hisashi-punch',
      title: '히사시 펀치',
      description: '맞닿은 한순간을 길게. 풀리는 힘은 한 번에.',
    },
    cuts,
    load: loadAssets,
    draw: drawScene,
    action: (snapshot) => {
      const sample = samplePunch(snapshot.elapsedMs);
      return `${snapshot.cut.label} · 남동 Cross-punch ${sample.pose} · 명중 ${sample.hitCount}회 · ${sample.ink ? '흑백' : '원색'}`;
    },
  });
}
