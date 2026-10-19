import { inkSpriteSheets } from './ink-effects.js';
import { circusTargetFrames, loadCircusTargetFrame, } from './meteor-circus-target.js';
import { loadInkSpriteFrame } from './ink-sprites.js';
import { kiSpriteSheet, loadKiSpriteFrame } from './ki-sprites.js';
import { comboFrameSteps, frameKey, loadSourceFrame, } from './source-frames.js';
import { loadCutinFrame } from './cutin-sprites.js';
import { combatEffectSheets, loadCombatEffectSpriteFrame, } from './combat-effect-sprites.js';
/** 화면에서 선택한 동작의 그림과 진행 중인 요청을 함께 재사용한다. */
export class MotionFrameLoader {
    loaded = new Map();
    pending = new Map();
    readyMotions = new Set();
    get frames() {
        return this.loaded;
    }
    has(motion) {
        return this.readyMotions.has(motion.id);
    }
    async load(motion) {
        const requests = comboFrameSteps(motion).map((step) => this.loadFrame(frameKey(step), () => loadSourceFrame(step)));
        if (motion.finisher)
            requests.push(this.loadFrame('cutin:ataho', loadCutinFrame));
        if (motion.ki) {
            const sheet = kiSpriteSheet(motion.ki.style);
            if (sheet)
                requests.push(this.loadFrame(`ki-vfx:${sheet}`, () => loadKiSpriteFrame(sheet)));
            if (motion.ki.style === 'orbit')
                requests.push(this.loadFrame('ki-vfx:orbit-residue', () => loadKiSpriteFrame('orbit-residue')));
        }
        for (const sheet of inkSpriteSheets(motion))
            requests.push(this.loadFrame(`ink-vfx:${sheet}`, () => loadInkSpriteFrame(sheet)));
        for (const sheet of combatEffectSheets(motion))
            requests.push(this.loadFrame(`combat-vfx:${sheet}`, () => loadCombatEffectSpriteFrame(sheet)));
        if (motion.id === 'finisher-pegasus-meteor-circus')
            for (const definition of circusTargetFrames)
                requests.push(this.loadFrame(definition.key, () => loadCircusTargetFrame(definition)));
        await Promise.all(requests);
        this.readyMotions.add(motion.id);
    }
    loadFrame(key, load) {
        if (this.loaded.has(key))
            return Promise.resolve();
        const pending = this.pending.get(key);
        if (pending)
            return pending;
        const request = load()
            .then((frame) => {
            this.loaded.set(key, frame);
        })
            .finally(() => {
            // 실패도 제거해 같은 동작을 다시 선택하면 빠진 그림을 재시도한다.
            this.pending.delete(key);
        });
        this.pending.set(key, request);
        return request;
    }
}
