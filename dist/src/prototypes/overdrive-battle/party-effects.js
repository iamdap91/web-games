import * as THREE from 'three';
import { yeonmukBattleAnimations } from '../../resources/characters/yeonmuk/yeonmuk-visual.js';
import { resourceLayers } from '../../rendering/surface-types.js';
import { battlePixelsPerUnit, cameraDepth, cameraHeight, yeonmukSpriteScale, } from './battle-sprite.js';
import { yeonmukReducedMotionFrames, } from '../../resources/effects/yeonmuk/yeonmuk-vfx.js';
const screenUpY = cameraDepth / Math.hypot(cameraHeight, cameraDepth);
const wardHeight = 1.75;
function wardAnchor(ally) {
    // 두 아군 사이와 얼굴을 피하고 보호받는 캐릭터의 바깥쪽 어깨에 표식을 둔다.
    return { x: ally.x + (ally.kind === 'ataho' ? 1.05 : -1.05), z: ally.z };
}
/** 부적의 비행·형성·소모만 소유한다. 피해·보호 판정은 World가 전달한 결과를 표시한다. */
export class PartyEffects {
    textures;
    animations;
    group = new THREE.Group();
    sprites = new Map();
    castWindup = yeonmukBattleAnimations()
        .get('talisman-cast')
        .frames.slice(0, 2)
        .reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
    actorRing = new THREE.Mesh(new THREE.RingGeometry(0.36, 0.4, 32), new THREE.MeshBasicMaterial({
        color: 0x8af5de,
        side: THREE.DoubleSide,
        depthWrite: false,
    }));
    elapsed = 0;
    protectedId = null;
    wardContact = false;
    hit = null;
    cast = null;
    trigger = null;
    constructor(textures, animations) {
        this.textures = textures;
        this.animations = animations;
        for (const name of animations.keys()) {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                alphaTest: 0.01,
                depthWrite: false,
                // 캐릭터 깊이에 작은 보호 문양이 묻히지 않게 화면 앞에 표시한다.
                depthTest: false,
                side: THREE.DoubleSide,
            }));
            // 아타호 몸 그림은 잔상 객체가 2번 순서로 그리므로 보호 표식은 그 뒤에 표시한다.
            mesh.renderOrder = 4;
            mesh.scale.set(yeonmukSpriteScale, yeonmukSpriteScale / screenUpY, yeonmukSpriteScale);
            mesh.visible = false;
            this.sprites.set(name, { mesh, shapes: new Map(), frame: null });
            this.group.add(mesh);
        }
        this.actorRing.rotation.x = -Math.PI / 2;
        this.actorRing.visible = false;
        this.group.add(this.actorRing);
        this.group.traverse((object) => object.layers.set(resourceLayers.effects));
    }
    get paths() {
        return [...this.animations.values()].flatMap((animation) => animation.frames.map((frame) => frame.localPath));
    }
    addImpacts(impacts) {
        for (const impact of impacts) {
            const pulse = {
                targetId: impact.targetId,
                point: { x: impact.x, z: impact.z },
                age: 0,
            };
            if (impact.partyEffect === 'talisman-hit')
                this.hit = pulse;
            else if (impact.partyEffect === 'ward-trigger') {
                this.trigger = pulse;
                this.cast = null;
            }
        }
    }
    show(name, age, options) {
        const animation = this.animations.get(name);
        const sprite = this.sprites.get(name);
        if (!animation || !sprite)
            return false;
        const duration = animation.frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
        if (!options.repeat && age >= duration)
            return false;
        let frame = animation.frames[0];
        if (options.reducedMotion) {
            frame =
                animation.frames[yeonmukReducedMotionFrames[name]] ??
                    animation.frames.at(-1);
        }
        else {
            let time = age % duration;
            for (const candidate of animation.frames) {
                frame = candidate;
                const span = candidate.durationSeconds ?? 0.14;
                if (time + 1e-9 < span)
                    break;
                time -= span;
            }
        }
        if (sprite.frame !== frame) {
            let geometry = sprite.shapes.get(frame);
            if (!geometry) {
                geometry = new THREE.PlaneGeometry(frame.width / battlePixelsPerUnit, frame.height / battlePixelsPerUnit);
                geometry.translate((frame.width / 2 - frame.pivot.x) / battlePixelsPerUnit, (frame.height / 2 - frame.pivot.y) / battlePixelsPerUnit, 0);
                sprite.shapes.set(frame, geometry);
            }
            if (!sprite.frame)
                sprite.mesh.geometry.dispose();
            sprite.mesh.geometry = geometry;
            sprite.mesh.material.map = this.textures.get(frame.localPath) ?? null;
            sprite.mesh.material.needsUpdate = true;
            sprite.frame = frame;
        }
        // 로딩되지 않은 흰 면을 최종 연출로 표시하지 않는다.
        sprite.mesh.scale.x = options.mirror
            ? -yeonmukSpriteScale
            : yeonmukSpriteScale;
        sprite.mesh.visible = !!sprite.mesh.material.map;
        sprite.mesh.position.set(options.point.x, options.height, options.point.z);
        return true;
    }
    render(state, dt, reducedMotion) {
        for (const sprite of this.sprites.values())
            sprite.mesh.visible = false;
        if (!state.companion ||
            state.phase === 'victory' ||
            state.phase === 'defeat') {
            this.reset();
            return;
        }
        this.elapsed += dt;
        const allies = [state.player, state.companion];
        const current = allies.find((ally) => ally.id === state.activeActorId && ally.health > 0);
        this.actorRing.visible = state.phase === 'command' && !!current;
        if (current)
            this.actorRing.position.set(current.x, 0.047, current.z);
        const action = state.action;
        const casting = action?.kind === 'talisman' || action?.kind === 'ward';
        const actor = casting
            ? allies.find((ally) => ally.id === action.actorId && ally.health > 0)
            : null;
        const target = casting
            ? [...allies, ...state.enemies].find((fighter) => fighter.id === action.targetIds[0] && fighter.health > 0)
            : null;
        if (actor &&
            target &&
            action &&
            action.elapsed >= this.castWindup &&
            action.elapsed < action.contactTime) {
            const progress = Math.min(1, (action.elapsed - this.castWindup) /
                Math.max(0.001, action.contactTime - this.castWindup));
            // 시전 2번 프레임의 부적 손은 몸 기준점에서 오른쪽 8px에 있다.
            const launchX = action.origin.x + (8 / battlePixelsPerUnit) * yeonmukSpriteScale;
            const destination = action.kind === 'ward' ? wardAnchor(target) : target;
            const targetHeight = action.kind === 'ward' ? wardHeight : 1.15;
            this.show('talisman-flight', action.elapsed - this.castWindup, {
                point: {
                    x: launchX + (destination.x - launchX) * progress,
                    z: action.origin.z + (destination.z - action.origin.z) * progress,
                },
                height: 1.55 + (targetHeight - 1.55) * progress,
                mirror: destination.x < launchX,
                repeat: true,
                reducedMotion,
            });
        }
        const protectedAlly = allies.find((ally) => ally.id === state.protectedId && ally.health > 0);
        const wardContact = action?.kind === 'ward' && action.elapsed >= action.contactTime;
        if (protectedAlly) {
            if (this.protectedId !== protectedAlly.id ||
                (wardContact && !this.wardContact)) {
                this.cast = {
                    targetId: protectedAlly.id,
                    point: { x: protectedAlly.x, z: protectedAlly.z },
                    age: 0,
                };
                this.trigger = null;
            }
            if (this.cast &&
                !this.show('ward-cast', this.cast.age, {
                    point: wardAnchor(protectedAlly),
                    height: wardHeight,
                    reducedMotion,
                }))
                this.cast = null;
            if (!this.cast)
                this.show('ward-idle', this.elapsed, {
                    point: wardAnchor(protectedAlly),
                    height: wardHeight,
                    repeat: true,
                    reducedMotion,
                });
        }
        else
            this.cast = null;
        this.protectedId = protectedAlly?.id ?? null;
        this.wardContact = wardContact;
        if (this.hit &&
            !this.show('talisman-hit', this.hit.age, {
                point: this.hit.point,
                height: 1.15,
                reducedMotion,
            }))
            this.hit = null;
        if (this.trigger) {
            const ally = allies.find((fighter) => fighter.id === this.trigger?.targetId && fighter.health > 0);
            if (!ally ||
                !this.show('ward-trigger', this.trigger.age, {
                    point: wardAnchor(ally),
                    height: wardHeight,
                    reducedMotion,
                }))
                this.trigger = null;
        }
        for (const pulse of [this.hit, this.cast, this.trigger])
            if (pulse)
                pulse.age += dt;
    }
    reset() {
        this.hit = this.cast = this.trigger = null;
        this.protectedId = null;
        this.wardContact = false;
        this.elapsed = 0;
        this.actorRing.visible = false;
        for (const sprite of this.sprites.values())
            sprite.mesh.visible = false;
    }
    get diagnostics() {
        return [...this.sprites].map(([name, sprite]) => ({
            name,
            visible: sprite.mesh.visible,
            frame: sprite.frame?.localPath ?? null,
            point: { x: sprite.mesh.position.x, z: sprite.mesh.position.z },
            height: sprite.mesh.position.y,
        }));
    }
    dispose() {
        this.reset();
        for (const sprite of this.sprites.values()) {
            if (!sprite.frame)
                sprite.mesh.geometry.dispose();
            for (const geometry of sprite.shapes.values())
                geometry.dispose();
            sprite.mesh.material.dispose();
        }
        this.actorRing.geometry.dispose();
        this.actorRing.material.dispose();
        this.group.clear();
    }
}
