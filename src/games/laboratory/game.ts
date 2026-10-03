import {
  chooseScenario,
  type Anomaly,
  type Scenario,
  type ScenarioSelection,
} from './anomalies.js';
import { AnomalyMotion, type AnomalySnapshot } from './anomaly-motion.js';
export {
  isSelection,
  type Anomaly,
  type Scenario,
  type ScenarioSelection,
} from './anomalies.js';
import { ceiling, ceilingHeight, roomTurn } from './event-rules.js';
import { FrameChase, type ChaseSnapshot } from './frame-chase.js';
import { pipeHitsPlayer, pipeTriggerX } from './pipe-cascade.js';

export const world = { width: 2400, height: 430, ground: 340 } as const;
export const movement = {
  speed: 240,
  gravity: 1500,
  jumpSpeed: 440,
  flashSpeed: 850,
  flashDuration: 0.2,
} as const;
export type Direction = -1 | 0 | 1;
export type Phase =
  'playing' | 'squashed' | 'transition' | 'falling' | 'landing' | 'complete';
// 잔상까지 빛에 가려진 뒤 종료되도록 불투명 구간 안에 여유를 둔다.
export const exitLight = { start: 300, opaque: 2200, finish: 2340 } as const;
export const passage = { fadeOut: 0.22, fadeIn: 0.32, glitch: 1.1 } as const;
export type Motion = 'stand' | 'move' | 'jump';

export type PlayerSnapshot = {
  readonly x: number;
  readonly y: number;
  readonly facing: -1 | 1;
  readonly grounded: boolean;
  readonly flashAvailable: boolean;
  readonly flashRemaining: number;
  readonly motion: Motion;
};

export class Player {
  private x = 360;
  private y: number = world.ground;
  private velocityY = 0;
  private facing: -1 | 1 = 1;
  private flashDirection: -1 | 1 = 1;
  private flashRemaining = 0;
  private flashAvailable = true;
  private motion: Motion = 'stand';

  dropIn(): void {
    this.y = -65;
    this.velocityY = 220;
    this.motion = 'jump';
  }

  reflectMotion(): void {
    this.facing = this.facing === 1 ? -1 : 1;
    this.flashDirection = this.flashDirection === 1 ? -1 : 1;
  }

  squash(): void {
    this.y = world.ground;
    this.velocityY = 0;
    this.flashRemaining = 0;
    this.motion = 'stand';
  }

  stopAtCeiling(height: number): void {
    if (this.y - 62 >= height) return;
    this.y = Math.min(world.ground, height + 62);
    this.velocityY = Math.max(0, this.velocityY);
  }

  face(direction: Direction): void {
    if (direction !== 0) this.facing = direction;
  }

  jump(direction: Direction): void {
    this.face(direction);
    if (this.y === world.ground) {
      this.velocityY = -movement.jumpSpeed;
      // 입력이 같은 물리 틱에 두 번 들어와도 두 번째는 공중 입력이다.
      this.y -= 0.01;
    } else if (this.flashAvailable) {
      this.flashAvailable = false;
      this.flashDirection = this.facing;
      this.flashRemaining = movement.flashDuration;
      this.velocityY = -180;
    }
  }

  update(seconds: number, direction: Direction): void {
    if (direction !== 0) this.facing = direction;
    const flashing = this.flashRemaining > 0;
    const velocityX = flashing
      ? this.flashDirection * movement.flashSpeed
      : direction * movement.speed;
    this.flashRemaining = Math.max(0, this.flashRemaining - seconds);
    this.x = Math.max(
      24,
      Math.min(world.width - 24, this.x + velocityX * seconds),
    );
    this.velocityY += movement.gravity * seconds;
    this.y += this.velocityY * seconds;
    if (this.y >= world.ground) {
      this.y = world.ground;
      this.velocityY = 0;
      this.flashAvailable = true;
      this.flashRemaining = 0;
    }
    this.motion =
      this.y !== world.ground ? 'jump' : velocityX !== 0 ? 'move' : 'stand';
  }

  get snapshot(): PlayerSnapshot {
    return {
      x: this.x,
      y: this.y,
      facing: this.facing,
      grounded: this.y === world.ground,
      flashAvailable: this.flashAvailable,
      flashRemaining: this.flashRemaining,
      motion: this.motion,
    };
  }
}

export type GameSnapshot = {
  readonly player: PlayerSnapshot;
  readonly mirrored: boolean;
  readonly squashElapsed: number | null;
  readonly anomaly: AnomalySnapshot;
  readonly chase: ChaseSnapshot;
  readonly landingElapsed: number | null;
  readonly scenario: Scenario;
  readonly phase: Phase;
  readonly progress: number;
  readonly pipeElapsed: number | null;
  readonly transitionElapsed: number | null;
  readonly failureElapsed: number | null;
  readonly hitElapsed: number | null;
  readonly previousRoom: number;
  readonly encountered: readonly Anomaly[];
};

type Transition = {
  elapsed: number;
  swapped: boolean;
  readonly nextRoom: number;
  readonly failed: boolean;
  readonly ending: boolean;
  readonly hit: boolean;
};

export class LaboratoryGame {
  private player = new Player();
  private anomaly = new AnomalyMotion();
  private chase = new FrameChase();
  private landingElapsed: number | null = null;
  private squashElapsed: number | null = null;
  private scenario: Scenario = 'normal';
  private selection: ScenarioSelection = 'random';
  private phase: Phase = 'playing';
  private progress = 0;
  private pipeElapsed: number | null = null;
  private transition: Transition | null = null;
  private failureElapsed: number | null = null;
  private previousRoom = 0;
  private readonly encountered = new Set<Anomaly>();

  constructor(private readonly random: () => number = Math.random) {}

  reset(selection: ScenarioSelection = 'random'): void {
    this.selection = selection;
    this.encountered.clear();
    this.progress = this.previousRoom = 0;
    this.transition = null;
    this.failureElapsed = null;
    this.phase = 'playing';
    this.loadRoom();
  }

  previewExit(): void {
    this.player = new Player();
    this.anomaly = new AnomalyMotion();
    this.chase = new FrameChase();
    this.landingElapsed = null;
    this.squashElapsed = null;
    this.pipeElapsed = this.failureElapsed = null;
    this.progress = 7;
    this.scenario = 'normal';
    // 실제 플레이와 같은 7 → 8 전환 경로로 종료 장면을 확인한다.
    this.leave('right');
  }

  face(direction: Direction): void {
    if (this.phase === 'playing')
      this.player.face(this.worldDirection(direction));
  }

  jump(direction: Direction): void {
    if (this.phase === 'playing')
      this.player.jump(this.worldDirection(direction));
  }

  private get mirrored(): boolean {
    return (
      this.scenario === 'mirrored-lab' &&
      roomTurn(this.anomaly.snapshot.activeElapsed) >= 0.5
    );
  }

  private worldDirection(direction: Direction): Direction {
    return this.mirrored
      ? direction === 0
        ? 0
        : direction === 1
          ? -1
          : 1
      : direction;
  }

  update(seconds: number, direction: Direction): void {
    if (this.failureElapsed !== null) {
      this.failureElapsed += seconds;
      if (this.failureElapsed >= passage.glitch) this.failureElapsed = null;
    }
    if (this.phase === 'squashed') {
      this.squashElapsed = (this.squashElapsed ?? 0) + seconds;
      this.anomaly.update(
        seconds,
        this.scenario,
        this.player.snapshot,
        this.player.snapshot,
      );
      if (this.squashElapsed >= 1.05) this.startTransition(0, true, false);
      return;
    }
    if (this.phase === 'falling') {
      if (this.chase.fall(seconds)) {
        this.previousRoom = this.progress;
        this.progress = 0;
        this.loadRoom();
        this.failureElapsed = 0;
        this.player.dropIn();
        this.landingElapsed = 0;
        this.phase = 'landing';
      }
      return;
    }
    if (this.phase === 'landing') {
      this.landingElapsed = (this.landingElapsed ?? 0) + seconds;
      this.player.update(seconds, 0);
      if (this.player.snapshot.grounded) {
        this.phase = 'playing';
        this.landingElapsed = null;
        this.squashElapsed = null;
      }
      return;
    }
    if (this.phase === 'transition') {
      this.updateTransition(seconds);
      return;
    }
    if (this.phase !== 'playing') return;
    const previousPlayer = this.player.snapshot;
    const wasMirrored = this.mirrored;
    this.player.update(seconds, this.worldDirection(direction));
    const { x } = this.player.snapshot;
    if (this.progress === 8) {
      if (x >= exitLight.finish) this.leave('right');
      return;
    }
    const revealed = this.anomaly.update(
      seconds,
      this.scenario,
      this.player.snapshot,
      previousPlayer,
    );
    if (!wasMirrored && this.mirrored) this.player.reflectMotion();
    const slam = this.anomaly.snapshot.ceilingSlam;
    if (
      this.scenario === 'lowering-ceiling' &&
      slam === null &&
      x + 16 >= ceiling.edge
    )
      this.player.stopAtCeiling(ceilingHeight(x, null) + 48);
    if (
      this.scenario === 'lowering-ceiling' &&
      slam !== null &&
      x + 16 >= ceiling.edge &&
      this.player.snapshot.y - 62 <= ceilingHeight(x, slam) + 40
    ) {
      this.encountered.add('lowering-ceiling');
      this.player.squash();
      this.squashElapsed = 0;
      this.phase = 'squashed';
      return;
    }
    if (
      revealed &&
      this.scenario !== 'normal' &&
      this.scenario !== 'falling-pipe'
    )
      this.encountered.add(this.scenario);
    if (
      this.scenario === 'frame-escape' &&
      this.anomaly.snapshot.activeElapsed !== null
    ) {
      this.chase.update(
        seconds,
        this.player.snapshot,
        this.anomaly.snapshot.activeElapsed,
      );
      if (this.chase.snapshot.phase === 'falling') {
        this.phase = 'falling';
        return;
      }
    }
    if (this.pipeElapsed !== null) {
      const before = this.pipeElapsed;
      this.pipeElapsed += seconds;
      if (
        pipeHitsPlayer(
          before,
          this.pipeElapsed,
          previousPlayer,
          this.player.snapshot,
        )
      ) {
        this.startTransition(0, true, false, true);
        return;
      }
    }
    if (
      this.scenario === 'falling-pipe' &&
      this.pipeElapsed === null &&
      previousPlayer.x < pipeTriggerX &&
      x >= pipeTriggerX
    ) {
      this.pipeElapsed = 0;
      this.encountered.add('falling-pipe');
    }
    const atBackstageDoor =
      this.scenario === 'folding-stage' &&
      this.anomaly.snapshot.backstageReturning &&
      x <= 250;
    if (atBackstageDoor || x <= 55) this.leave('left');
    else if (
      x >= world.width - 55 &&
      !(
        this.scenario === 'frame-escape' &&
        this.anomaly.snapshot.activeElapsed !== null
      )
    )
      this.leave('right');
  }

  private loadRoom(): void {
    this.player = new Player();
    this.anomaly = new AnomalyMotion();
    this.chase = new FrameChase();
    this.landingElapsed = null;
    this.squashElapsed = null;
    this.pipeElapsed = null;
    if (
      this.progress === 8 ||
      (this.selection === 'random' && this.progress === 0)
    ) {
      // 0번 방이 반복 가능한 기준 풍경이 되어 별도의 튜토리얼 팝업을 대신한다.
      this.scenario = 'normal';
    } else if (this.selection !== 'random') this.scenario = this.selection;
    else {
      this.scenario = chooseScenario(this.random());
    }
  }

  private leave(exit: 'left' | 'right'): void {
    const ending = this.progress === 8;
    const correct =
      ending || (this.scenario === 'normal') === (exit === 'right');
    this.startTransition(
      ending ? 8 : correct ? this.progress + 1 : 0,
      !correct,
      ending,
    );
  }

  private startTransition(
    nextRoom: number,
    failed: boolean,
    ending: boolean,
    hit = false,
  ): void {
    this.previousRoom = this.progress;
    this.transition = {
      elapsed: 0,
      swapped: false,
      nextRoom,
      failed,
      ending,
      hit,
    };
    this.phase = 'transition';
  }

  private updateTransition(seconds: number): void {
    const transition = this.transition;
    if (!transition) return;
    transition.elapsed += seconds;
    if (!transition.swapped && transition.elapsed >= passage.fadeOut) {
      if (transition.ending) {
        this.transition = null;
        this.phase = 'complete';
        return;
      }
      this.progress = transition.nextRoom;
      this.loadRoom();
      transition.swapped = true;
      if (transition.failed) this.failureElapsed = 0;
    }
    // 실패 숫자를 읽기 전에 달려 지나치지 않도록 입장 연출 동안만 입력을 잠근다.
    const duration =
      passage.fadeOut + (transition.failed ? passage.glitch : passage.fadeIn);
    if (transition.elapsed < duration) return;
    this.transition = null;
    this.phase = 'playing';
  }

  get snapshot(): GameSnapshot {
    return {
      player: this.player.snapshot,
      mirrored: this.mirrored,
      squashElapsed: this.squashElapsed,
      anomaly: this.anomaly.snapshot,
      chase: this.chase.snapshot,
      landingElapsed: this.landingElapsed,
      scenario: this.scenario,
      phase: this.phase,
      progress: this.progress,
      pipeElapsed: this.pipeElapsed,
      transitionElapsed: this.transition?.elapsed ?? null,
      failureElapsed: this.failureElapsed,
      hitElapsed:
        this.transition?.hit && !this.transition.swapped
          ? this.transition.elapsed
          : null,
      previousRoom: this.previousRoom,
      encountered: [...this.encountered],
    };
  }
}
