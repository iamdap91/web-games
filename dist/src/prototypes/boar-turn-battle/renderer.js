import { BattleMap } from './battle-map.js';
import { battleStage as world } from './battle-stage.js';
import manifest from '../../../resources/manifest.json' with { type: 'json' };
import { resourceUrl } from '../../resources/catalog/resource-url.js';
import { yeonmukVfxAnimations } from '../../resources/effects/yeonmuk/yeonmuk-vfx.js';
import { ELEMENTS, ENCOUNTERS, } from './encounters.js';
import { animationAt, animationDuration, partyAttackFrame, partyFormation, partyMotions, } from './party-motions.js';
const tones = {
    neutral: '#f3e6c5',
    element: '#a5ecff',
    break: '#ffce77',
    damage: '#ffada2',
    guard: '#bbe1d7',
};
const clamp = (value) => Math.max(0, Math.min(1, value));
const ease = (value) => 1 - (1 - clamp(value)) ** 3;
const bossAppearance = {
    boar: {
        asset: 'ai/armored-boar',
        scale: 2.2,
        ground: world.ground + 25,
        shadow: 112,
        advance: 425,
        heroAdvance: 375,
        contactFrame: 4,
        readyFrame: 2,
        windupEnd: 2,
        strikeStart: 3,
        recoveryFrame: 4,
    },
    bear: {
        asset: 'ai/monster-hoarfrost-bear',
        scale: 1.9,
        ground: world.ground + 45,
        shadow: 94,
        advance: 365,
        heroAdvance: 375,
        contactFrame: 9,
        readyFrame: 3,
        windupEnd: 4,
        strikeStart: 5,
        recoveryFrame: 12,
    },
    armadillo: {
        asset: 'ai/monster-ember-core-armadillo',
        scale: 2.2,
        ground: world.ground + 35,
        shadow: 88,
        advance: 400,
        heroAdvance: 400,
        contactFrame: 5,
        readyFrame: 2,
        windupEnd: 2,
        strikeStart: 3,
        recoveryFrame: 6,
    },
    mantis: {
        asset: 'ai/monster-bamboo-blade-mantis',
        scale: 2,
        ground: world.ground + 45,
        shadow: 78,
        advance: 425,
        heroAdvance: 425,
        contactFrame: 5,
        readyFrame: 2,
        windupEnd: 2,
        strikeStart: 3,
        recoveryFrame: 6,
    },
};
function animationsFor(id) {
    const asset = manifest.assets.find((entry) => entry.id === id);
    if (!asset)
        throw new Error(`전투 리소스가 없습니다: ${id}`);
    const animations = new Map();
    for (const [key, value] of Object.entries(asset.animations))
        animations.set(key, value);
    return animations;
}
/** 화면과 이미지 수명만 소유하며, 전투 진행과 입력은 외부에서 전달받는다. */
export class BattleRenderer {
    canvas;
    encounter;
    ctx;
    party = partyMotions(animationsFor('ai/ataho-v2'));
    effects = yeonmukVfxAnimations();
    boss;
    map;
    images = new Map();
    heroFeet = new Map();
    startedAt = performance.now();
    destroyed = false;
    constructor(canvas, encounter, options = {}) {
        this.canvas = canvas;
        this.encounter = encounter;
        this.boss = animationsFor(bossAppearance[encounter].asset);
        this.map = new BattleMap(encounter, options.mapVariant ?? 'original');
        const context = canvas.getContext('2d');
        if (!context)
            throw new Error('전투 화면을 만들 수 없습니다.');
        this.ctx = context;
    }
    async load() {
        this.map.prepare();
        const heroFrames = new Map([...this.party.ataho.values()].flatMap((animation) => animation.frames.map((frame) => [frame.localPath, frame])));
        const paths = new Set(heroFrames.keys());
        for (const animations of [...Object.values(this.party), this.effects]) {
            for (const animation of animations.values()) {
                for (const frame of animation.frames)
                    paths.add(frame.localPath);
            }
        }
        const groups = [
            [this.boss, ['stand', 'move', 'attack1', 'hit1', 'die1']],
        ];
        for (const [animations, names] of groups) {
            for (const name of names) {
                const animation = this.motion(animations, name);
                for (const frame of animation.frames)
                    paths.add(frame.localPath);
            }
        }
        await Promise.all([...paths].map(async (path) => {
            const image = new Image();
            image.src = resourceUrl(path).href;
            await image.decode();
            if (this.destroyed)
                return;
            this.images.set(path, image);
            const heroFrame = heroFrames.get(path);
            if (heroFrame)
                this.heroFeet.set(path, this.feetY(image, heroFrame));
        }));
    }
    draw(snapshot, visual) {
        if (this.destroyed)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        const width = Math.max(1, Math.round(rect.width * ratio));
        const height = Math.max(1, Math.round(rect.height * ratio));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        const ctx = this.ctx;
        ctx.setTransform(width / world.width, 0, 0, height / world.height, 0, 0);
        ctx.imageSmoothingEnabled = false;
        const time = (performance.now() - this.startedAt) / 1000;
        this.map.drawBackground(ctx, time);
        const scale = Math.min(width / world.width, height / world.height);
        const offsetX = (width - world.width * scale) / 2;
        ctx.setTransform(scale, 0, 0, scale, offsetX, 0);
        this.fighters(snapshot, visual, time);
        this.map.drawForeground(ctx);
        this.battleMessage(visual);
    }
    destroy() {
        this.destroyed = true;
        this.images.clear();
        this.heroFeet.clear();
        this.map.dispose();
    }
    feetY(image, frame) {
        const canvas = document.createElement('canvas');
        canvas.width = frame.width;
        canvas.height = frame.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx)
            throw new Error('아타호의 발 위치를 읽을 수 없습니다.');
        ctx.drawImage(image, 0, 0, frame.width, frame.height);
        const pixels = ctx.getImageData(0, 0, frame.width, frame.height).data;
        // 조합실과 같은 알파 기준으로 투명 여백이 다른 v2 원본의 발을 맞춘다.
        for (let y = frame.height - 1; y >= 0; y--) {
            for (let x = 0; x < frame.width; x++) {
                if (pixels[(y * frame.width + x) * 4 + 3] > 24)
                    return y + 1;
            }
        }
        return frame.height - frame.pivot.y;
    }
    motion(animations, name) {
        const animation = animations.get(name);
        if (!animation?.frames.length)
            throw new Error(`전투 모션이 없습니다: ${name}`);
        return animation;
    }
    frame(animations, name, progress) {
        return animationAt(this.motion(animations, name), progress);
    }
    sprite(frame, x, y, scale, rotation = 0) {
        const image = this.images.get(frame.localPath);
        if (!image)
            return;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(rotation);
        ctx.drawImage(image, -frame.pivot.x * scale, -(this.heroFeet.get(frame.localPath) ?? frame.height - frame.pivot.y) *
            scale, frame.width * scale, frame.height * scale);
        ctx.restore();
    }
    fighters(snapshot, visual, time) {
        const p = clamp(visual.progress);
        const appearance = bossAppearance[this.encounter];
        const bear = this.encounter === 'bear';
        const targetId = visual.targetIds[0] ?? 'ataho';
        const target = visual.targetIds.length > 1
            ? { x: 300, ground: 335 }
            : partyFormation[targetId];
        const advance = world.bossX - target.x - 110;
        let bossX = world.bossX;
        let bossY = appearance.ground;
        let bossFrame = this.frame(this.boss, 'stand', (time % 0.8) / 0.8);
        let bossRotation = snapshot.broken ? 0.11 : 0;
        if (this.encounter !== 'boar' &&
            !snapshot.broken &&
            visual.stage === 'idle') {
            if (visual.intent.prepared)
                bossFrame = this.motion(this.boss, 'attack1').frames[appearance.readyFrame];
            else if (bear && visual.intent.armored)
                bossFrame = this.motion(this.boss, 'attack1').frames[8];
        }
        if (visual.stage === 'player' &&
            visual.action !== 'guard' &&
            visual.action !== 'ward' &&
            p >= 0.6 &&
            p < 0.86) {
            bossFrame = this.frame(this.boss, 'hit1', 0);
            bossX +=
                Math.sin(clamp((p - 0.6) / 0.26) * Math.PI) *
                    (visual.action === 'heavy' ? 32 : 16);
        }
        if (visual.stage === 'enemy') {
            const travel = ease((p - 0.65) / 0.35);
            bossX -= advance * travel;
            bossY += (target.ground + 20 - bossY) * travel;
            bossFrame =
                this.encounter !== 'boar'
                    ? this.bossAttackFrame(p, visual.intent)
                    : visual.intent.id === 'charge'
                        ? this.frame(this.boss, p < 0.65 ? 'attack1' : 'move', p < 0.65 ? p * 0.6 : (p - 0.65) / 0.35)
                        : this.frame(this.boss, 'attack1', p * 0.48);
            if (this.encounter === 'boar' && p > 0.95)
                bossFrame = this.motion(this.boss, 'attack1').frames[4];
            if (p < 0.65)
                bossX += Math.sin(p * 48) * p * (visual.intent.prepared ? 4 : 1);
            this.dust(bossX + 70, bossY, travel);
        }
        if (visual.stage === 'impact' || visual.stage === 'counter') {
            const travel = visual.stage === 'impact'
                ? visual.countered
                    ? 1
                    : 1 - ease(p)
                : 1 - ease((p - 0.3) / 0.7);
            bossX -= advance * travel;
            bossY += (target.ground + 20 - bossY) * travel;
            const attack = this.motion(this.boss, 'attack1');
            const recoveryStart = appearance.recoveryFrame / attack.frames.length;
            bossFrame =
                visual.stage === 'counter'
                    ? p < 0.3
                        ? attack.frames[appearance.contactFrame]
                        : this.frame(this.boss, 'hit1', (p - 0.3) / 0.7)
                    : this.frame(this.boss, 'attack1', recoveryStart + p * (1 - recoveryStart));
        }
        if (visual.stage === 'recover') {
            bossRotation = visual.intent.id === 'recover' ? 0.11 * (1 - ease(p)) : 0;
            bossFrame = this.frame(this.boss, visual.intent.id === 'recover' && p < 0.6 ? 'hit1' : 'stand', p);
        }
        if (visual.stage === 'victory' ||
            (visual.stage === 'idle' && snapshot.bossHp <= 0)) {
            bossFrame = this.frame(this.boss, 'die1', visual.stage === 'victory' ? p : 1);
            bossRotation = 0;
        }
        else if (visual.stage === 'idle' && snapshot.broken)
            bossFrame = this.frame(this.boss, 'hit1', 0);
        for (const member of [...snapshot.party].sort((left, right) => partyFormation[left.id].ground - partyFormation[right.id].ground)) {
            const formation = partyFormation[member.id];
            const motions = this.party[member.id];
            const idle = this.motion(motions, 'idle');
            const duration = animationDuration(idle);
            let frame = animationAt(idle, (time % duration) / duration);
            let x = formation.x;
            let y = formation.ground;
            const attacking = visual.stage === 'player' &&
                visual.actorId === member.id &&
                visual.action !== null &&
                visual.action !== 'guard';
            const guarding = member.guarding ||
                (visual.stage === 'player' &&
                    visual.actorId === member.id &&
                    visual.action === 'guard');
            const countering = visual.stage === 'counter' && visual.counterActorId === member.id;
            const hit = visual.hits.find((entry) => entry.actorId === member.id);
            if (attacking && visual.action) {
                frame = partyAttackFrame(motions, member.id, visual.action, p);
                if (member.id !== 'yeonmuk') {
                    const travel = ease((p - 0.2) / 0.34) * (1 - ease((p - 0.72) / 0.28));
                    x += (world.bossX - 115 - x) * travel;
                    y += (appearance.ground - 15 - y) * travel;
                }
            }
            else if (countering) {
                frame = partyAttackFrame(motions, member.id, 'attack', p, {
                    contactAt: 0.24,
                    recoverAt: 0.53,
                });
                x += Math.sin(p * Math.PI) * 32;
            }
            else if (guarding && member.hp > 0) {
                frame = idle.frames[0];
            }
            if (visual.stage === 'impact' && hit && hit.damage > 0) {
                x -= Math.sin(p * Math.PI) * (hit.guarded ? 10 : 28);
                const hurt = motions.get('hit');
                if (!hit.guarded && hurt)
                    frame = animationAt(hurt, 0.34 + p * 0.66);
            }
            if (member.hp <= 0) {
                const defeat = motions.get('defeat');
                // 비월은 없는 쓰러짐 자세를 합성하지 않고 기존 자세와 전투불능 표식을 사용한다.
                frame = defeat
                    ? animationAt(defeat, visual.stage === 'impact' && hit?.knockedOut ? p : 1)
                    : idle.frames[0];
            }
            if (member.hp > 0) {
                if (snapshot.activeActorId === member.id &&
                    visual.stage === 'idle' &&
                    snapshot.phase === 'command')
                    this.actorRing(x, y, '#f4d38b');
                if (visual.targetIds.includes(member.id) && visual.stage === 'enemy')
                    this.actorRing(x, y, '#ef9d88');
            }
            this.shadow(x, 45, y);
            this.ctx.save();
            if (member.hp <= 0)
                this.ctx.globalAlpha = 0.45;
            this.sprite(frame, x, y, 2.65);
            this.ctx.restore();
            if (member.hp <= 0)
                this.memberLabel(x, y + 18, '전투불능', '#c2b7b3');
            else {
                if (guarding && visual.stage !== 'impact')
                    this.guardArc(x, y, '#a3d5cc');
                if (visual.warded || snapshot.warded) {
                    const effect = visual.stage === 'impact'
                        ? 'ward-trigger'
                        : attacking && visual.action === 'ward'
                            ? 'ward-cast'
                            : 'ward-idle';
                    this.sprite(animationAt(this.effects.get(effect), visual.stage === 'idle' ? time % 1 : p), x - 43, y - 84, 1.5);
                }
            }
            if (visual.stage === 'impact' && hit && hit.damage > 0) {
                this.contactSpark(x + 35, y - 75, p, hit.guarded ? '#a6d9d2' : '#ffc0a0');
                this.memberLabel(x, y - 168 - p * 16, `−${hit.damage}`, hit.guarded ? '#c6eee0' : '#ffd0bb');
            }
            if (countering && p > 0.24)
                this.contactSpark(x + 65, y - 85, (p - 0.24) / 0.5, '#c9eee5');
        }
        this.shadow(bossX, appearance.shadow, bossY);
        this.sprite(bossFrame, bossX, bossY, appearance.scale, bossRotation);
        if (bear &&
            visual.intent.armored &&
            !snapshot.broken &&
            snapshot.bossHp > 0)
            this.frostArmor(bossX, bossY, time);
        if (snapshot.broken && visual.stage !== 'victory')
            this.breakStars(bossX, time);
        if (this.encounter === 'armadillo' &&
            visual.intent.damage === 0 &&
            snapshot.bossHp > 0 &&
            !snapshot.broken)
            this.overheatSmoke(bossX, bossY, time);
        if (visual.intent.physicalCounterDamage &&
            !snapshot.broken &&
            snapshot.bossHp > 0)
            this.counterGlint(bossX, bossY, time);
        if (visual.stage === 'player' &&
            visual.actorId === 'yeonmuk' &&
            visual.action !== 'guard' &&
            visual.action !== 'ward') {
            const from = partyFormation.yeonmuk;
            if (p >= 0.22 && p < 0.6) {
                const travel = clamp((p - 0.22) / 0.38);
                this.sprite(animationAt(this.effects.get('talisman-flight'), travel), from.x + 30 + (world.bossX - from.x - 65) * travel, from.ground - 100 + (appearance.ground - from.ground + 10) * travel, 2);
            }
            if (p >= 0.6 && p < 0.9)
                this.sprite(animationAt(this.effects.get('talisman-hit'), (p - 0.6) / 0.3), bossX - 25, bossY - 80, 2);
        }
        if (visual.stage === 'player' &&
            visual.action !== 'guard' &&
            visual.action !== 'ward' &&
            p >= 0.6 &&
            p < 0.86) {
            const progress = (p - 0.6) / 0.26;
            if (visual.element === 'fire')
                this.fireBurst(bossX - 35, bossY - 80, progress);
            else if (visual.element === 'ice')
                this.iceBurst(bossX - 35, bossY - 95, progress);
            else if (visual.element === 'wind')
                this.windBurst(bossX - 35, bossY - 80, progress);
            else
                this.contactSpark(bossX - 65, bossY - 85, progress, visual.action === 'heavy' ? '#ffcd79' : '#f7e3ba');
        }
    }
    actorRing(x, y, color) {
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y + 1, 47, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    guardArc(x, y, color) {
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x + 32, y - 75, 30, 62, -0.1, -1.3, 1.3);
        ctx.stroke();
    }
    memberLabel(x, y, text, color) {
        const ctx = this.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '700 19px "Pretendard", "Apple SD Gothic Neo", sans-serif';
        ctx.strokeStyle = '#0b1e20';
        ctx.lineWidth = 5;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
    bossAttackFrame(progress, intent) {
        const attack = this.motion(this.boss, 'attack1');
        const appearance = bossAppearance[this.encounter];
        const index = progress < 0.65
            ? intent.prepared
                ? appearance.readyFrame
                : Math.min(appearance.windupEnd, Math.floor((progress / 0.65) * (appearance.windupEnd + 1)))
            : appearance.strikeStart +
                Math.min(appearance.contactFrame - appearance.strikeStart, Math.floor(((progress - 0.65) / 0.3) *
                    (appearance.contactFrame - appearance.strikeStart + 1)));
        return attack.frames[index];
    }
    overheatSmoke(x, ground, time) {
        const ctx = this.ctx;
        ctx.fillStyle = '#b6aaa044';
        for (let index = 0; index < 4; index++) {
            const phase = (time * 0.7 + index / 4) % 1;
            ctx.beginPath();
            ctx.ellipse(x + (index - 1.5) * 16, ground - 110 - phase * 55, 7 + phase * 9, 10 + phase * 12, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    counterGlint(x, ground, time) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.45 + Math.sin(time * 4) * 0.2;
        ctx.strokeStyle = '#e9f2b5';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 80, ground - 90);
        ctx.lineTo(x - 40, ground - 125);
        ctx.moveTo(x - 80, ground - 125);
        ctx.lineTo(x - 40, ground - 90);
        ctx.stroke();
        ctx.restore();
    }
    windBurst(x, y, progress) {
        const ctx = this.ctx;
        const p = clamp(progress);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = '#c8f5dd';
        ctx.lineWidth = 3;
        for (const offset of [-18, 0, 18]) {
            ctx.beginPath();
            ctx.ellipse(x + p * 40, y + offset, 20 + p * 55, 13 + p * 26, -0.25, -2.2, 1.2);
            ctx.stroke();
        }
        ctx.restore();
    }
    frostArmor(x, ground, time) {
        const ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = 0.65 + Math.sin(time * 2) * 0.12;
        ctx.strokeStyle = '#bde9ff';
        ctx.fillStyle = '#9bd6ed33';
        ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + side * 64, ground - 148);
            ctx.lineTo(x + side * 92, ground - 100);
            ctx.lineTo(x + side * 72, ground - 34);
            ctx.lineTo(x + side * 48, ground - 88);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }
    fireBurst(x, y, progress) {
        const ctx = this.ctx;
        const p = clamp(progress);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        for (let index = 0; index < 8; index++) {
            const angle = (index * Math.PI * 2) / 8;
            const emberX = x + Math.cos(angle) * (16 + p * 66);
            const emberY = y + Math.sin(angle) * (18 + p * 30) - p * 35;
            ctx.fillStyle = index % 2 === 0 ? '#ffd395' : '#fb8852';
            ctx.fillRect(emberX - 3, emberY - 8, 6, 16 * (1 - p));
        }
        ctx.restore();
    }
    shadow(x, radius, ground = world.ground) {
        const ctx = this.ctx;
        ctx.fillStyle = '#07181570';
        ctx.beginPath();
        ctx.ellipse(x, ground + 2, radius, 10, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    dust(x, y, progress) {
        const ctx = this.ctx;
        if (progress <= 0)
            return;
        ctx.fillStyle = '#ac9b7155';
        for (let index = 0; index < 7; index++) {
            const phase = (progress * 2 + index / 7) % 1;
            ctx.fillRect(x + phase * 80, y - 4 - phase * 24, 5 + phase * 10, 4 + phase * 5);
        }
    }
    contactSpark(x, y, progress, color) {
        const ctx = this.ctx;
        const p = clamp(progress);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        for (let index = 0; index < 8; index++) {
            const angle = (index * Math.PI) / 4;
            ctx.beginPath();
            ctx.moveTo(x + Math.cos(angle) * (10 + p * 10), y + Math.sin(angle) * (10 + p * 10));
            ctx.lineTo(x + Math.cos(angle) * (18 + p * 36), y + Math.sin(angle) * (18 + p * 36));
            ctx.stroke();
        }
        ctx.restore();
    }
    iceBurst(x, y, progress) {
        const ctx = this.ctx;
        const p = clamp(progress);
        ctx.save();
        ctx.globalAlpha = 1 - p;
        ctx.fillStyle = '#b9f4ff';
        for (let index = 0; index < 9; index++) {
            const angle = (index * Math.PI * 2) / 9;
            const shardX = x + Math.cos(angle) * (35 + p * 65);
            const shardY = y + Math.sin(angle) * (25 + p * 42);
            ctx.beginPath();
            ctx.moveTo(shardX, shardY - 12);
            ctx.lineTo(shardX + 6, shardY);
            ctx.lineTo(shardX, shardY + 12);
            ctx.lineTo(shardX - 6, shardY);
            ctx.fill();
        }
        ctx.restore();
    }
    breakStars(x, time) {
        const ctx = this.ctx;
        ctx.fillStyle = '#f0ca79';
        for (let index = 0; index < 3; index++) {
            const angle = time * 2.2 + (index * Math.PI * 2) / 3;
            const starX = x + Math.cos(angle) * 48;
            const starY = world.ground - 150 + Math.sin(angle) * 8;
            ctx.fillRect(starX - 5, starY - 2, 10, 4);
            ctx.fillRect(starX - 2, starY - 5, 4, 10);
        }
    }
    battleMessage(visual) {
        if (!visual.message)
            return;
        const ctx = this.ctx;
        const opacity = 1 - clamp((visual.messageAge - 1.8) / 0.5);
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '700 26px "Pretendard", "Apple SD Gothic Neo", sans-serif';
        ctx.strokeStyle = '#0b1e20';
        ctx.lineWidth = 7;
        ctx.lineJoin = 'round';
        const messageY = this.encounter === 'bear' ? 240 : 205;
        ctx.strokeText(visual.message, 550, messageY);
        ctx.fillStyle =
            visual.messageTone === 'element'
                ? ELEMENTS[visual.element ?? ENCOUNTERS[this.encounter].weakness].color
                : tones[visual.messageTone];
        ctx.fillText(visual.message, 550, messageY);
        ctx.restore();
    }
}
