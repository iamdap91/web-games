import { pipeTriggerX } from './pipe-cascade.js';

export const world = { width: 2400, height: 430, ground: 340 } as const;
export const movement = {
  speed: 240,
  gravity: 1500,
  jumpSpeed: 440,
  flashSpeed: 850,
  flashDuration: 0.2,
} as const;
export type Direction = -1 | 0 | 1;
export type Scenario = 'normal' | 'giant-door' | 'falling-pipe';
export type ScenarioSelection = 'random' | Scenario;
export type Phase = 'playing' | 'transition' | 'complete';
export const passage = { fadeOut: 0.22, fadeIn: 0.32, glitch: 1.1 } as const;
export type Motion = 'stand' | 'move' | 'jump';

export function isSelection(value: string): value is ScenarioSelection {
  return ['random', 'normal', 'giant-door', 'falling-pipe'].includes(value);
}

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
      this.y < world.ground ? 'jump' : velocityX !== 0 ? 'move' : 'stand';
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
  readonly scenario: Scenario;
  readonly phase: Phase;
  readonly progress: number;
  readonly pipeElapsed: number | null;
  readonly transitionElapsed: number | null;
  readonly failureElapsed: number | null;
  readonly previousRoom: number;
};

type Transition = {
  elapsed: number;
  swapped: boolean;
  readonly nextRoom: number;
  readonly failed: boolean;
};

export class LaboratoryGame {
  private player = new Player();
  private scenario: Scenario = 'normal';
  private selection: ScenarioSelection = 'random';
  private phase: Phase = 'playing';
  private progress = 0;
  private pipeElapsed: number | null = null;
  private transition: Transition | null = null;
  private failureElapsed: number | null = null;
  private previousRoom = 0;

  constructor(private readonly random: () => number = Math.random) {}

  reset(selection: ScenarioSelection = 'random'): void {
    this.selection = selection;
    this.progress = this.previousRoom = 0;
    this.transition = null;
    this.failureElapsed = null;
    this.phase = 'playing';
    this.loadRoom();
  }

  previewExit(): void {
    this.reset(this.selection);
    this.progress = 7;
    this.scenario = 'normal';
    // 실제 플레이와 같은 7 → 8 전환 경로로 종료 장면을 확인한다.
    this.leave('right');
  }

  face(direction: Direction): void {
    if (this.phase === 'playing') this.player.face(direction);
  }

  jump(direction: Direction): void {
    if (this.phase === 'playing') this.player.jump(direction);
  }

  update(seconds: number, direction: Direction): void {
    if (this.failureElapsed !== null) {
      this.failureElapsed += seconds;
      if (this.failureElapsed >= passage.glitch) this.failureElapsed = null;
    }
    if (this.phase === 'transition') {
      this.updateTransition(seconds);
      return;
    }
    if (this.phase !== 'playing') return;
    const previousX = this.player.snapshot.x;
    this.player.update(seconds, direction);
    const { x } = this.player.snapshot;
    if (this.pipeElapsed !== null) this.pipeElapsed += seconds;
    if (
      this.scenario === 'falling-pipe' &&
      this.pipeElapsed === null &&
      Math.min(previousX, x) <= pipeTriggerX + 200 &&
      Math.max(previousX, x) >= pipeTriggerX - 200
    )
      this.pipeElapsed = 0;
    if (x <= 55) this.leave('left');
    else if (x >= world.width - 55) this.leave('right');
  }

  private loadRoom(): void {
    this.player = new Player();
    this.pipeElapsed = null;
    if (
      this.progress === 8 ||
      (this.selection === 'random' && this.progress === 0)
    ) {
      // 0번 방이 반복 가능한 기준 풍경이 되어 별도의 튜토리얼 팝업을 대신한다.
      this.scenario = 'normal';
    } else if (this.selection !== 'random') this.scenario = this.selection;
    else {
      const roll = this.random();
      this.scenario =
        roll < 0.3 ? 'normal' : roll < 0.65 ? 'giant-door' : 'falling-pipe';
    }
  }

  private leave(exit: 'left' | 'right'): void {
    const correct = (this.scenario === 'normal') === (exit === 'right');
    this.previousRoom = this.progress;
    this.transition = {
      elapsed: 0,
      swapped: false,
      nextRoom: correct ? this.progress + 1 : 0,
      failed: !correct,
    };
    this.phase = 'transition';
  }

  private updateTransition(seconds: number): void {
    const transition = this.transition;
    if (!transition) return;
    transition.elapsed += seconds;
    if (!transition.swapped && transition.elapsed >= passage.fadeOut) {
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
    this.phase = this.progress === 8 ? 'complete' : 'playing';
  }

  get snapshot(): GameSnapshot {
    return {
      player: this.player.snapshot,
      scenario: this.scenario,
      phase: this.phase,
      progress: this.progress,
      pipeElapsed: this.pipeElapsed,
      transitionElapsed: this.transition?.elapsed ?? null,
      failureElapsed: this.failureElapsed,
      previousRoom: this.previousRoom,
    };
  }
}
