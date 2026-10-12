import {
  isMonsterId,
  monsterDefinition,
  type MonsterDefinition,
} from './monster-catalog.js';
import {
  animationDuration,
  monsterMotionFrame,
  monsterNativeFacing,
  type MonsterMotionName,
} from './monster-motions.js';
import { yeonmukBattlePose } from './yeonmuk-battle-motion.js';
import { GuardMotion, hurtPose, reactionTimings } from './reaction-motion.js';
import { guardFrames } from '../../resources/characters/ataho/combat-frames.js';
import { drinkPose } from './drink-motion.js';
import { cardinalFacing } from '../../resources/characters/ataho/facing.js';
import type { SpriteTextures } from '../../rendering/sprite-textures.js';
import * as THREE from 'three';
import type {
  Animation,
  AnimationFrame,
} from '../../resources/preview/animation-player.js';
import type { FighterSnapshot, Point } from './combatant.js';
import {
  actionPosition,
  forestEnemyAttackTimings,
  type ActionSnapshot,
  type Impact,
  type Healing,
  type Phase,
} from './world.js';
import { introPose, overdriveIntro } from './overdrive-intro.js';
import { OverdriveAura } from './overdrive-aura.js';
import { barragePose, type TigerBarrageSnapshot } from './tiger-barrage.js';
import { turnAttackPose } from './turn-attack.js';
import { drivePose } from './overdrive-motion.js';
import type { DriveReturnSnapshot } from './overdrive-return.js';
import { StaggerStars } from './stagger-stars.js';
import { MushroomMotion, mushroomMotionRules } from './mushroom-motion.js';
import { MushroomSpores } from './mushroom-spores.js';

export const battlePixelsPerUnit = 32;
export const yeonmukSpriteScale = 1.12;
export const cameraHeight = 21;
export const cameraDepth = 25;
const screenUpY = cameraDepth / Math.hypot(cameraHeight, cameraDepth);

function frameAt(animation: Animation, time: number): AnimationFrame {
  const duration = animation.frames.reduce(
    (sum, frame) => sum + (frame.durationSeconds ?? 0.14),
    0,
  );
  let remaining = time % duration;
  for (const frame of animation.frames) {
    remaining -= frame.durationSeconds ?? 0.14;
    if (remaining < 0) return frame;
  }
  return animation.frames[0]!;
}

export class BattleSprite {
  readonly group = new THREE.Group();
  readonly shadow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private readonly material = new THREE.MeshBasicMaterial({
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    transparent: true,
  });
  private readonly mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    this.material,
  );
  private readonly shapes = new Map<AnimationFrame, THREE.PlaneGeometry>();
  private readonly driveAura: OverdriveAura | null;
  private readonly staggerStars: StaggerStars | null;
  private readonly mushroomMotion: MushroomMotion | null;
  private readonly mushroomSpores: MushroomSpores | null;
  private readonly monster: MonsterDefinition | null;
  private readonly nativeFacing: 'left' | 'right';
  private frame: AnimationFrame | null = null;
  private elapsed = 0;
  private readonly guardMotion = new GuardMotion();
  private hurtAt = -100;
  private healedAt = -100;
  private deathAt: number | null = null;
  private impact: Impact | null = null;

  constructor(
    private readonly animations: ReadonlyMap<string, Animation>,
    private readonly textures: SpriteTextures,
    fighter: Pick<FighterSnapshot, 'kind' | 'radius'>,
  ) {
    this.monster = isMonsterId(fighter.kind)
      ? monsterDefinition(fighter.kind)
      : null;
    this.nativeFacing = this.monster
      ? monsterNativeFacing(this.monster.id)
      : 'left';
    this.mesh.layers.set(1);
    this.group.add(this.mesh);
    this.mushroomMotion =
      fighter.kind === 'mushroom' ? new MushroomMotion(animations) : null;
    this.mushroomSpores =
      fighter.kind === 'mushroom' ? new MushroomSpores() : null;
    if (this.mushroomSpores) this.group.add(this.mushroomSpores.group);
    this.driveAura =
      fighter.kind === 'ataho'
        ? new OverdriveAura(this.group, this.mesh)
        : null;
    this.staggerStars = fighter.kind === 'ataho' ? null : new StaggerStars();
    if (this.staggerStars) this.group.add(this.staggerStars.group);
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(fighter.radius, 24),
      new THREE.MeshBasicMaterial({
        color: 0x111c18,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.y = 0.65;
  }

  hit(impact: Impact): void {
    this.hurtAt = this.elapsed;
    this.impact = impact;
    this.mushroomMotion?.hit();
  }
  heal(): void {
    this.healedAt = this.elapsed;
  }
  castHeal(healing: Healing): void {
    // 신규 몬스터의 시전 자세는 활성 행동을 따르므로 회복 이벤트로 재시작하지 않는다.
    this.mushroomMotion?.cast();
    this.mushroomSpores?.cast({
      x: healing.x - this.group.position.x,
      z: healing.z - this.group.position.z,
    });
  }
  reset(): void {
    this.elapsed = 0;
    this.guardMotion.reset();
    this.hurtAt = -100;
    this.healedAt = -100;
    this.deathAt = null;
    this.impact = null;
    this.driveAura?.reset();
    this.staggerStars?.reset();
    this.mushroomMotion?.reset();
    this.mushroomSpores?.reset();
  }

  staggerLabelAnchor(): THREE.Vector3 | null {
    const stars = this.staggerStars?.group;
    if (!stars?.visible) return null;
    // 이름표와 대상 선택 화살표가 머리 위의 별을 덮지 않게 공간을 확보한다.
    return stars.position
      .clone()
      .add(this.group.position)
      .add(new THREE.Vector3(0, 0.95, 0));
  }

  labelHeight(): number {
    if (!this.frame) return 0;
    // 새 공격에서 머리보다 높이 든 손도 이름표에 가리지 않게 한다.
    return (
      this.group.position.y +
      ((this.frame.height - this.frame.pivot.y) / battlePixelsPerUnit) *
        this.mesh.scale.y +
      0.35
    );
  }

  selectionCorners(): readonly THREE.Vector3[] {
    if (!this.frame) return [];
    // 실제 프레임과 발 pivot으로 만든 사각형을 투영해 큰 개체의 머리·옆면도 선택한다.
    this.mesh.updateWorldMatrix(true, false);
    this.mesh.geometry.computeBoundingBox();
    const bounds = this.mesh.geometry.boundingBox;
    if (!bounds) return [];
    return [
      [bounds.min.x, bounds.min.y],
      [bounds.max.x, bounds.min.y],
      [bounds.max.x, bounds.max.y],
      [bounds.min.x, bounds.max.y],
    ].map(([x, y]) =>
      new THREE.Vector3(x, y, 0).applyMatrix4(this.mesh.matrixWorld),
    );
  }

  private animation(name: string): Animation {
    const animation = this.animations.get(name);
    if (!animation) throw new Error(`전투 모션이 없습니다: ${name}`);
    return animation;
  }

  private pose(
    fighter: FighterSnapshot,
    options: {
      readonly phase: Phase;
      readonly action: ActionSnapshot | null;
      readonly guarding: boolean;
      readonly phaseTime: number;
      readonly barrage: TigerBarrageSnapshot | null;
      readonly returning: DriveReturnSnapshot | null;
      readonly drunken: boolean;
      readonly reducedMotion: boolean;
      readonly preparing: boolean;
    },
  ): { frame: AnimationFrame; mirror: boolean } {
    const {
      phase,
      action,
      phaseTime,
      barrage,
      returning,
      drunken,
      reducedMotion,
    } = options;
    const ataho = fighter.kind === 'ataho';
    const mirror = ataho
      ? cardinalFacing(fighter.facing) === 'left'
      : fighter.facing === 'right';
    const hurt = this.elapsed - this.hurtAt;
    if (this.monster) {
      const nativeMirror =
        (fighter.facing === 'right' ? 'right' : 'left') !== this.nativeFacing;
      const sample = (name: MonsterMotionName, age: number, repeat = false) => {
        const animation = this.animation(name);
        return animation.frames[
          monsterMotionFrame(animation, age, { repeat })
        ]!;
      };
      if (this.deathAt !== null)
        return {
          frame: sample(
            'die1',
            reducedMotion
              ? animationDuration(this.animation('die1'))
              : this.elapsed - this.deathAt,
          ),
          mirror: nativeMirror,
        };
      if (hurt < animationDuration(this.animation('hit1')))
        return {
          frame: sample(
            'hit1',
            reducedMotion
              ? animationDuration(this.animation('hit1')) * 0.5
              : hurt,
          ),
          mirror: nativeMirror,
        };
      const active = action?.actorId === fighter.id ? action : null;
      if (active?.monsterMotion) {
        const { arrivalTime, returnTime, mode } = active.monsterMotion;
        const returning = active.elapsed >= returnTime;
        if (mode === 'melee' && (active.elapsed < arrivalTime || returning)) {
          const time = returning
            ? arrivalTime + active.elapsed - returnTime
            : active.elapsed;
          return {
            frame: sample('move', reducedMotion ? 0 : time * 1.5, true),
            mirror: returning ? !nativeMirror : nativeMirror,
          };
        }
        return {
          frame: sample(
            'attack1',
            (reducedMotion ? active.contactTime : active.elapsed) - arrivalTime,
          ),
          mirror: nativeMirror,
        };
      }
      return {
        frame: sample('stand', reducedMotion ? 0 : this.elapsed, true),
        mirror: nativeMirror,
      };
    }
    if (fighter.kind === 'yeonmuk')
      return {
        frame: yeonmukBattlePose(this.animations, {
          elapsed: this.elapsed,
          hurtAge: hurt,
          deathAge: this.deathAt === null ? null : this.elapsed - this.deathAt,
          action: action?.actorId === fighter.id ? action : null,
          reducedMotion,
        }).frame,
        mirror: false,
      };
    if (fighter.kind === 'mushroom') {
      return {
        frame: this.mushroomMotion!.frame({ reducedMotion }),
        mirror,
      };
    }
    if (ataho && barrage) {
      const pose = barragePose(barrage);
      return {
        frame: this.animation(pose.animation).frames[pose.frame]!,
        mirror: pose.direction < 0,
      };
    }
    if (ataho && phase === 'breaking') {
      const pose = introPose(phaseTime);
      return {
        frame: this.animation(pose.animation).frames[pose.frame]!,
        mirror,
      };
    }
    if (this.deathAt !== null) {
      const frames = this.animation('die1').frames;
      return {
        frame:
          frames[
            Math.min(
              frames.length - 1,
              Math.floor((this.elapsed - this.deathAt) / 0.13),
            )
          ]!,
        mirror,
      };
    }
    if (hurt < reactionTimings.hurtDuration) {
      const guarded = this.impact?.guarded && ataho;
      const animation = this.animation(guarded ? 'guard' : 'hit1');
      return {
        frame: ataho
          ? animation.frames[guarded ? guardFrames.held : hurtPose(hurt)]!
          : animation.frames.at(-1)!,
        mirror,
      };
    }
    if (ataho && returning) {
      if (returning.heldAction) {
        const pose = drivePose(returning.heldAction, fighter.facing);
        return {
          frame: this.animation(pose.animation).frames[pose.frame]!,
          mirror: pose.mirror,
        };
      }
      if (returning.moving) {
        const suffix = fighter.facing === 'front' ? '' : `-${fighter.facing}`;
        return {
          frame: this.animation(`move${suffix}`).frames[
            returning.progress < 0.5 ? 2 : 1
          ]!,
          mirror: false,
        };
      }
      return { frame: this.animation('battle-ready').frames[0]!, mirror };
    }
    if (action?.actorId === fighter.id) {
      const progress = action.elapsed / action.duration;
      if (action.enemyMotion) {
        const arrivalTime =
          action.duration * forestEnemyAttackTimings.arrivalProgress;
        const returnTime =
          action.duration * forestEnemyAttackTimings.returnProgress;
        const returning = action.elapsed >= returnTime;
        if (action.elapsed < arrivalTime || returning) {
          const animation = this.animation('move');
          const moveTime = returning
            ? action.elapsed - returnTime
            : action.elapsed;
          return {
            frame: reducedMotion
              ? animation.frames[0]!
              : frameAt(animation, moveTime * 1.5),
            mirror: returning ? !mirror : mirror,
          };
        }
        const frames = this.animation('attack1').frames;
        const contactFrame = Math.min(4, frames.length - 1);
        // 생성된 낮은 공격 자세를 실제 접촉에 맞추고 회복 자세까지 적 앞에서 마친다.
        const index =
          action.elapsed < action.contactTime
            ? Math.floor(
                (contactFrame * (action.elapsed - arrivalTime)) /
                  (action.contactTime - arrivalTime),
              )
            : contactFrame +
              Math.floor(
                ((frames.length - contactFrame) *
                  (action.elapsed - action.contactTime)) /
                  (returnTime - action.contactTime),
              );
        return {
          frame: frames[Math.min(frames.length - 1, Math.max(0, index))]!,
          mirror,
        };
      }
      if (!ataho) {
        const name = fighter.kind === 'slime' ? 'jump' : 'attack1';
        const frames = this.animation(name).frames;
        return {
          frame:
            frames[
              Math.min(frames.length - 1, Math.floor(progress * frames.length))
            ]!,
          mirror,
        };
      }
      if (action.kind === 'drink')
        return {
          frame: this.animation('drink').frames[drinkPose(action.elapsed)]!,
          mirror,
        };
      if (action.kind === 'attack' || action.kind === 'skill') {
        const pose = turnAttackPose(
          action.kind,
          action.elapsed,
          fighter.facing,
          action.skill,
        );
        return {
          frame: this.animation(pose.animation).frames[pose.frame]!,
          mirror: pose.mirror,
        };
      }
      const pose = drivePose(action, fighter.facing);
      return {
        frame: this.animation(pose.animation).frames[pose.frame]!,
        mirror: pose.mirror,
      };
    }
    if (ataho && phase === 'victory')
      return {
        frame: frameAt(this.animation('victory'), this.elapsed),
        mirror: false,
      };
    const guardFrame = this.guardMotion.frame;
    if (ataho && guardFrame !== null)
      return { frame: this.animation('guard').frames[guardFrame]!, mirror };
    if (!ataho && fighter.staggered)
      return { frame: this.animation('hit1').frames.at(-1)!, mirror };
    if (fighter.kind === 'boar' && options.preparing)
      return { frame: this.animation('attack1').frames[3]!, mirror };
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
        frame:
          frames[
            reducedMotion ? 0 : Math.floor(this.elapsed / 0.8) % frames.length
          ]!,
        mirror: false,
      };
    }
    return { frame: this.animation('battle-ready').frames[0]!, mirror };
  }

  render(
    fighter: FighterSnapshot,
    options: {
      readonly phase: Phase;
      readonly phaseTime: number;
      readonly action: ActionSnapshot | null;
      readonly guarding: boolean;
      readonly dt: number;
      readonly reducedMotion: boolean;
      readonly barrage: TigerBarrageSnapshot | null;
      readonly returning: DriveReturnSnapshot | null;
      readonly drunken: boolean;
      readonly preparing: boolean;
      readonly healing: boolean;
      readonly visualPoint: Point | null;
      readonly frozen: boolean;
    },
  ): void {
    const { phase, phaseTime, action, dt, reducedMotion, barrage } = options;
    this.elapsed += dt;
    this.guardMotion.update(options.guarding && fighter.kind === 'ataho', dt);
    this.mushroomMotion?.update({
      dt,
      alive: fighter.health > 0,
      preparing: options.preparing && !fighter.staggered,
      healing: options.healing,
    });
    if (fighter.health <= 0 && this.deathAt === null)
      this.deathAt = this.elapsed;
    const deathAge = this.mushroomMotion
      ? this.mushroomMotion.snapshot.deathTime
      : this.deathAt === null
        ? 0
        : this.elapsed - this.deathAt;
    const pose = this.pose(fighter, options);
    if (this.frame !== pose.frame) {
      let geometry = this.shapes.get(pose.frame);
      if (!geometry) {
        geometry = new THREE.PlaneGeometry(
          pose.frame.width / battlePixelsPerUnit,
          pose.frame.height / battlePixelsPerUnit,
        );
        geometry.translate(
          (pose.frame.width / 2 - pose.frame.pivot.x) / battlePixelsPerUnit,
          (pose.frame.height / 2 - pose.frame.pivot.y) / battlePixelsPerUnit,
          0,
        );
        this.shapes.set(pose.frame, geometry);
      }
      if (!this.frame) this.mesh.geometry.dispose();
      this.mesh.geometry = geometry;
      this.material.map = this.textures.get(pose.frame.localPath) ?? null;
      this.material.needsUpdate = true;
      this.frame = pose.frame;
    }
    const hero = fighter.kind === 'ataho';
    const scale = hero
      ? 1.18
      : fighter.kind === 'yeonmuk'
        ? yeonmukSpriteScale
        : (this.monster?.displayScale ?? 0.84);
    this.mesh.scale.set(pose.mirror ? -scale : scale, scale / screenUpY, scale);
    const active = action?.actorId === fighter.id ? action : null;
    const point =
      options.visualPoint ?? (active ? actionPosition(active) : fighter);
    const hurt = Math.max(0, this.elapsed - this.hurtAt);
    const drive = this.impact?.drive;
    const hitShape = Math.pow(
      Math.max(0, 1 - hurt / (drive?.finisher ? 0.28 : 0.18)),
      2,
    );
    // 접촉 첫 프레임부터 반동 자세를 만든 뒤 타격 정지 동안 그대로 붙잡는다.
    const recoil =
      fighter.kind === 'yeonmuk' || this.monster
        ? 0
        : this.mushroomMotion
          ? fighter.health > 0 && hurt < mushroomMotionRules.recoilDuration
            ? Math.pow(1 - hurt / mushroomMotionRules.recoilDuration, 2) *
              (reducedMotion ? 0.02 : 0.16)
            : 0
          : drive
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
    if (
      !hero &&
      !this.monster &&
      !this.mushroomMotion &&
      drive &&
      !reducedMotion
    ) {
      const squash = hitShape * (drive.finisher ? 0.055 : 0.025);
      this.mesh.scale.x *= 1 + squash;
      this.mesh.scale.y *= 1 - squash;
      this.mesh.rotation.z =
        -Math.sign(this.impact!.aim.x || 1) *
        hitShape *
        (drive.finisher === 'sweep' ? 0.1 : drive.finisher ? 0.065 : 0.025);
    }
    const jump =
      active && fighter.kind === 'slime'
        ? Math.sin(Math.min(1, active.elapsed / active.duration) * Math.PI) *
          0.3
        : 0;
    this.group.position.set(
      point.x +
        (hero && phase === 'breaking'
          ? introPose(phaseTime).offset * (pose.mirror ? -1 : 1)
          : 0) +
        (this.impact?.aim.x ?? 0) * recoil,
      0.06 +
        jump +
        (!this.monster &&
        !this.mushroomMotion &&
        !reducedMotion &&
        drive?.finisher === 'push'
          ? hitShape * 0.09
          : 0),
      point.z + (this.impact?.aim.z ?? 0) * recoil,
    );
    if (hero && barrage) {
      const motion = barragePose(barrage);
      this.group.position.set(
        motion.point.x,
        0.06 + motion.height,
        motion.point.z,
      );
    } else if (this.impact?.barrage?.final && hurt < 0.28) {
      // 판정 위치는 즉시 밀되 화면에서는 마지막 타격점부터 짧게 미끄러진다.
      const settle = 1 - Math.pow(1 - hurt / 0.28, 3);
      this.group.position.x =
        this.impact.x + (fighter.x - this.impact.x) * settle;
      this.group.position.z =
        this.impact.z + (fighter.z - this.impact.z) * settle;
    }
    const healed = this.elapsed - this.healedAt < 0.45;
    const healing = options.healing || healed;
    const preparing =
      options.preparing &&
      fighter.health > 0 &&
      (!this.mushroomMotion || !fighter.staggered);
    this.material.color.setHex(
      hurt < 0.09
        ? 0xffdba6
        : healing
          ? 0x88ffc0
          : preparing
            ? fighter.kind === 'boar' || this.monster?.role === 'charger'
              ? 0xffd6a1
              : 0xc1f5c9
            : options.frozen
              ? 0xb6e9ff
              : 0xffffff,
    );
    if (preparing && !this.monster && fighter.kind !== 'boar' && !reducedMotion)
      this.group.position.y += Math.sin(this.elapsed * 4) * 0.035;
    if (this.mushroomMotion) {
      if (fighter.health <= 0) {
        this.material.color.setHex(0xffffff);
        if (!reducedMotion) {
          const settle = Math.min(
            1,
            Math.max(
              0,
              (deathAge - mushroomMotionRules.deathHold) /
                mushroomMotionRules.deathSettle,
            ),
          );
          this.mesh.scale.multiplyScalar(1 - settle * 0.12);
          this.group.position.y -= settle * 0.035;
        }
      } else if (hurt < 0.08) this.material.color.setRGB(1.12, 1.12, 1.08);
      this.mushroomSpores?.render({
        dt,
        alive: fighter.health > 0,
        preparing,
        healing: this.mushroomMotion.snapshot.mode === 'heal',
        reducedMotion,
      });
    }
    this.material.opacity =
      this.deathAt === null
        ? 1
        : Math.max(0, 1 - Math.max(0, deathAge - 0.45) / 0.35);
    if (this.monster) this.material.opacity = 1;
    if (fighter.kind === 'yeonmuk') {
      // 실제 자세가 반동·회수·쓰러짐을 표현하므로 임시 회전·부유·퇴장 효과를 겹치지 않는다.
      this.material.opacity = 1;
      this.material.color.setHex(0xffffff);
    }
    this.group.visible = this.material.opacity > 0;
    this.shadow.visible = this.group.visible;
    this.shadow.position.set(
      this.group.position.x,
      0.034,
      this.group.position.z,
    );
    this.shadow.material.opacity = this.material.opacity * 0.3;
    this.staggerStars?.render({
      active: fighter.staggered && fighter.health > 0,
      head: {
        x:
          ((pose.frame.width / 2 - pose.frame.pivot.x) / battlePixelsPerUnit) *
          this.mesh.scale.x,
        y:
          ((pose.frame.height - pose.frame.pivot.y) / battlePixelsPerUnit) *
          this.mesh.scale.y,
      },
      screenUpY,
      dt,
      reducedMotion,
    });
    this.driveAura?.render({
      style: phase === 'ultimate' ? 'rage' : 'overdrive',
      power:
        phase === 'overdrive' || phase === 'ultimate'
          ? 1
          : phase === 'breaking'
            ? Math.min(1, phaseTime / overdriveIntro.impactAt)
            : 0,
      trail:
        barrage !== null
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

  get diagnostics(): {
    readonly frame: string | null;
    readonly rotation: number;
    readonly mirrored: boolean;
    readonly visible: boolean;
  } {
    return {
      frame: this.frame?.localPath ?? null,
      rotation: this.mesh.rotation.z,
      mirrored: this.mesh.scale.x < 0,
      visible: this.group.visible,
    };
  }

  dispose(): void {
    this.driveAura?.dispose();
    this.staggerStars?.dispose();
    this.mushroomSpores?.dispose();
    this.shapes.forEach((geometry) => geometry.dispose());
    if (!this.frame) this.mesh.geometry.dispose();
    this.material.dispose();
    this.shadow.geometry.dispose();
    this.shadow.material.dispose();
  }
}
