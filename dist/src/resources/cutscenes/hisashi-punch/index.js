import { mountCutscene } from '../shared/screen.js';
import { loadAssets } from './assets.js';
import { drawScene } from './drawing.js';
import { cuts, samplePunch } from './timeline.js';
mountCutscene({
    cuts,
    load: loadAssets,
    draw: drawScene,
    action: (snapshot) => {
        const sample = samplePunch(snapshot.elapsedMs);
        return `${snapshot.cut.label} · 남동 Cross-punch ${sample.pose} · 명중 ${sample.hitCount}회 · ${sample.ink ? '흑백' : '원색'}`;
    },
});
