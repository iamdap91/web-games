import { mountCutscene } from '../shared/screen.js';
import { loadAssets } from './assets.js';
import { CutsceneBattle } from './battle.js';
import { drawScene } from './drawing.js';
import { cuts } from './timeline.js';
const battle = new CutsceneBattle();
mountCutscene({
    cuts,
    load: loadAssets,
    draw: (ctx, snapshot, assets, options) => drawScene(ctx, snapshot, assets, options, battle),
    action: (snapshot) => {
        if (snapshot.cut.id !== 'battle' && snapshot.cut.id !== 'slash')
            return snapshot.cut.label;
        const sample = battle.sample(snapshot.elapsedMs);
        return `${sample.phase} · 명중 ${sample.hitCount}회 · 원본 ${sample.pose.step.frame} · ${Math.round(sample.pose.elapsedMs)}ms`;
    },
});
