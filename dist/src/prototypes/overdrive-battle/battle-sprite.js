import * as THREE from 'three';
import { actionPosition, } from './world.js';
import { introPose, overdriveIntro } from './overdrive-intro.js';
import { OverdriveAura } from './overdrive-aura.js';
import { barragePose } from './tiger-barrage.js';
import { turnAttackPose } from './turn-attack.js';
import { drivePose } from './overdrive-motion.js';
import { StaggerStars } from './stagger-stars.js';
const pixelsPerUnit = 32;
export const cameraHeight = 21;
export const cameraDepth = 25;
const screenUpY = cameraDepth / Math.hypot(cameraHeight, cameraDepth);
function frameAt(animation, time) {
    const duration = animation.frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
    let remaining = time % duration;
    for (const frame of animation.frames) {
        remaining -= frame.durationSeconds ?? 0.14;
        if (remaining < 0)
            return frame;
    }
    return animation.frames[0];
}
export class BattleSprite {
    animations;
    textures;
    group = new THREE.Group();
    shadow;
    material = new THREE.MeshBasicMaterial({
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
    });
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    shapes = new Map();
    driveAura;
    staggerStars;
    frame = null;
    elapsed = 0;
    hurtAt = -100;
    deathAt = null;
    impact = null;
    constructor(animations, textures, fighter) {
        this.animations = animations;
        this.textures = textures;
        this.mesh.layers.set(1);
        this.group.add(this.mesh);
        this.driveAura =
            fighter.kind === 'ataho'
                ? new OverdriveAura(this.group, this.mesh)
                : null;
        this.staggerStars = fighter.kind === 'ataho' ? null : new StaggerStars();
        if (this.staggerStars)
            this.group.add(this.staggerStars.group);
        this.shadow = new THREE.Mesh(new THREE.CircleGeometry(fighter.radius, 24), new THREE.MeshBasicMaterial({
            color: 0x111c18,
            transparent: true,
            opacity: 0.32,
            depthWrite: false,
        }));
        this.shadow.rotation.x = -Math.PI / 2;
        this.shadow.scale.y = 0.65;
    }
    hit(impact) {
        this.hurtAt = this.elapsed;
        this.impact = impact;
    }
    reset() {
        this.elapsed = 0;
        this.hurtAt = -100;
        this.deathAt = null;
        this.impact = null;
        this.driveAura?.reset();
        this.staggerStars?.reset();
    }
    staggerLabelAnchor() {
        const stars = this.staggerStars?.group;
        if (!stars?.visible)
            return null;
        // 이름표와 대상 선택 화살표가 머리 위의 별을 덮지 않게 공간을 확보한다.
        return stars.position
            .clone()
            .add(this.group.position)
            .add(new THREE.Vector3(0, 0.95, 0));
    }
    animation(name) {
        const animation = this.animations.get(name);
        if (!animation)
            throw new Error(`전투 모션이 없습니다: ${name}`);
        return animation;
    }
    pose(fighter, options) {
        const { phase, action, guarding, phaseTime, barrage, returning, drunken, reducedMotion, } = options;
        const ataho = fighter.kind === 'ataho';
        const mirror = ataho
            ? fighter.facing === 'left'
            : fighter.facing === 'right';
        const hurt = this.elapsed - this.hurtAt;
        if (ataho && barrage) {
            const pose = barragePose(barrage);
            return {
                frame: this.animation(pose.animation).frames[pose.frame],
                mirror: pose.direction < 0,
            };
        }
        if (ataho && phase === 'breaking')
            return {
                frame: this.animation('tiger-fist').frames[introPose(phaseTime).frame],
                mirror,
            };
        if (this.deathAt !== null) {
            const frames = this.animation('die1').frames;
            return {
                frame: frames[Math.min(frames.length - 1, Math.floor((this.elapsed - this.deathAt) / 0.13))],
                mirror,
            };
        }
        if (hurt < 0.23)
            return {
                frame: this.animation(this.impact?.guarded && ataho ? 'guard' : 'hit1').frames.at(-1),
                mirror,
            };
        if (ataho && returning) {
            if (returning.heldAction) {
                const pose = drivePose(returning.heldAction, fighter.facing);
                return {
                    frame: this.animation(pose.animation).frames[pose.frame],
                    mirror: pose.mirror,
                };
            }
            if (returning.moving) {
                const suffix = fighter.facing === 'front' ? '' : `-${fighter.facing}`;
                return {
                    frame: this.animation(`move${suffix}`).frames[returning.progress < 0.5 ? 2 : 1],
                    mirror: false,
                };
            }
            return { frame: this.animation('battle-ready').frames[0], mirror };
        }
        if (action?.actorId === fighter.id) {
            const progress = action.elapsed / action.duration;
            if (!ataho) {
                const name = fighter.kind === 'yeti' ? 'attack1' : 'jump';
                const frames = this.animation(name).frames;
                return {
                    frame: frames[Math.min(frames.length - 1, Math.floor(progress * frames.length))],
                    mirror,
                };
            }
            if (action.kind === 'drink') {
                const frames = this.animation('drink').frames;
                return {
                    frame: frames[Math.min(frames.length - 1, Math.floor(progress * frames.length))],
                    mirror: false,
                };
            }
            if (action.kind === 'attack' || action.kind === 'skill') {
                const pose = turnAttackPose(action.kind, action.elapsed, fighter.facing, action.skill);
                return {
                    frame: this.animation(pose.animation).frames[pose.frame],
                    mirror: pose.mirror,
                };
            }
            const pose = drivePose(action, fighter.facing);
            return {
                frame: this.animation(pose.animation).frames[pose.frame],
                mirror: pose.mirror,
            };
        }
        if (ataho && phase === 'victory')
            return {
                frame: frameAt(this.animation('victory'), this.elapsed),
                mirror: false,
            };
        if (ataho && guarding)
            return { frame: this.animation('guard').frames.at(-1), mirror };
        if (!ataho && fighter.staggered)
            return { frame: this.animation('hit1').frames.at(-1), mirror };
        if (!ataho)
            return {
                frame: frameAt(this.animation('stand'), this.elapsed),
                mirror,
            };
        if (phase === 'overdrive' && fighter.moving) {
            const suffix = fighter.facing === 'front' ? '' : `-${fighter.facing}`;
            return {
                frame: frameAt(this.animation(`move${suffix}`), this.elapsed),
                mirror: false,
            };
        }
        if (drunken) {
            const frames = this.animation('hiccup').frames;
            return {
                frame: frames[reducedMotion ? 0 : Math.floor(this.elapsed / 0.8) % frames.length],
                mirror: false,
            };
        }
        return { frame: this.animation('battle-ready').frames[0], mirror };
    }
    render(fighter, options) {
        const { phase, phaseTime, action, dt, reducedMotion, barrage } = options;
        this.elapsed += dt;
        if (fighter.health <= 0 && this.deathAt === null)
            this.deathAt = this.elapsed;
        const deathAge = this.deathAt === null ? 0 : this.elapsed - this.deathAt;
        const pose = this.pose(fighter, options);
        if (this.frame !== pose.frame) {
            let geometry = this.shapes.get(pose.frame);
            if (!geometry) {
                geometry = new THREE.PlaneGeometry(pose.frame.width / pixelsPerUnit, pose.frame.height / pixelsPerUnit);
                geometry.translate((pose.frame.width / 2 - pose.frame.pivot.x) / pixelsPerUnit, (pose.frame.height / 2 - pose.frame.pivot.y) / pixelsPerUnit, 0);
                this.shapes.set(pose.frame, geometry);
            }
            if (!this.frame)
                this.mesh.geometry.dispose();
            this.mesh.geometry = geometry;
            this.material.map = this.textures.get(pose.frame.localPath) ?? null;
            this.material.needsUpdate = true;
            this.frame = pose.frame;
        }
        const hero = fighter.kind === 'ataho';
        const scale = hero ? 1.18 : 0.84;
        this.mesh.scale.set(pose.mirror ? -scale : scale, scale / screenUpY, scale);
        const active = action?.actorId === fighter.id ? action : null;
        const point = active ? actionPosition(active) : fighter;
        const hurt = Math.max(0, this.elapsed - this.hurtAt);
        const drive = this.impact?.drive;
        const hitShape = Math.pow(Math.max(0, 1 - hurt / (drive?.finisher ? 0.28 : 0.18)), 2);
        // 접촉 첫 프레임부터 반동 자세를 만든 뒤 타격 정지 동안 그대로 붙잡는다.
        const recoil = drive
            ? hitShape *
                (reducedMotion
                    ? 0.03
                    : drive.finisher === 'push'
                        ? 0.5
                        : drive.finisher
                            ? 0.38
                            : drive.beat === 1
                                ? 0.24
                                : 0.14)
            : hurt < 0.28
                ? Math.sin((hurt / 0.28) * Math.PI) * 0.18
                : 0;
        this.mesh.rotation.z = 0;
        if (!hero && drive && !reducedMotion) {
            const squash = hitShape * (drive.finisher ? 0.055 : 0.025);
            this.mesh.scale.x *= 1 + squash;
            this.mesh.scale.y *= 1 - squash;
            this.mesh.rotation.z =
                -Math.sign(this.impact.aim.x || 1) *
                    hitShape *
                    (drive.finisher === 'sweep' ? 0.1 : drive.finisher ? 0.065 : 0.025);
        }
        const jump = active && !hero
            ? Math.sin(Math.min(1, active.elapsed / active.duration) * Math.PI) *
                0.3
            : 0;
        this.group.position.set(point.x +
            (hero && phase === 'breaking'
                ? introPose(phaseTime).offset * (pose.mirror ? -1 : 1)
                : 0) +
            (this.impact?.aim.x ?? 0) * recoil, 0.06 +
            jump +
            (!reducedMotion && drive?.finisher === 'push' ? hitShape * 0.09 : 0), point.z + (this.impact?.aim.z ?? 0) * recoil);
        if (hero && barrage) {
            const motion = barragePose(barrage);
            this.group.position.set(motion.point.x, 0.06 + motion.height, motion.point.z);
        }
        else if (this.impact?.barrage?.final && hurt < 0.28) {
            // 판정 위치는 즉시 밀되 화면에서는 마지막 타격점부터 짧게 미끄러진다.
            const settle = 1 - Math.pow(1 - hurt / 0.28, 3);
            this.group.position.x =
                this.impact.x + (fighter.x - this.impact.x) * settle;
            this.group.position.z =
                this.impact.z + (fighter.z - this.impact.z) * settle;
        }
        this.material.color.setHex(hurt < 0.09 ? 0xffdba6 : 0xffffff);
        this.material.opacity =
            this.deathAt === null
                ? 1
                : Math.max(0, 1 - Math.max(0, deathAge - 0.45) / 0.35);
        this.group.visible = this.material.opacity > 0;
        this.shadow.visible = this.group.visible;
        this.shadow.position.set(this.group.position.x, 0.034, this.group.position.z);
        this.shadow.material.opacity = this.material.opacity * 0.3;
        this.staggerStars?.render({
            active: fighter.staggered && fighter.health > 0,
            head: {
                x: ((pose.frame.width / 2 - pose.frame.pivot.x) / pixelsPerUnit) *
                    this.mesh.scale.x,
                y: ((pose.frame.height - pose.frame.pivot.y) / pixelsPerUnit) *
                    this.mesh.scale.y,
            },
            screenUpY,
            dt,
            reducedMotion,
        });
        this.driveAura?.render({
            style: phase === 'ultimate' ? 'rage' : 'overdrive',
            power: phase === 'overdrive' || phase === 'ultimate'
                ? 1
                : phase === 'breaking'
                    ? Math.min(1, phaseTime / overdriveIntro.impactAt)
                    : 0,
            trail: barrage !== null
                ? 'move'
                : phase !== 'overdrive'
                    ? 'none'
                    : active
                        ? 'attack'
                        : fighter.moving
                            ? 'move'
                            : 'none',
            reducedMotion,
            dt,
        });
    }
    dispose() {
        this.driveAura?.dispose();
        this.staggerStars?.dispose();
        this.shapes.forEach((geometry) => geometry.dispose());
        if (!this.frame)
            this.mesh.geometry.dispose();
        this.material.dispose();
        this.shadow.geometry.dispose();
        this.shadow.material.dispose();
    }
}
