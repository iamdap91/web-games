export const world = { width: 2400, height: 430, ground: 340 } as const;
export const movement = {
  speed: 240,
  gravity: 1500,
  jumpSpeed: 440,
  flashSpeed: 850,
  flashDuration: 0.2,
} as const;
export const pipeX = 1460;
export type Direction = -1 | 0 | 1;
export type Scenario = 'normal' | 'giant-door' | 'falling-pipe';
export type ScenarioSelection = 'random' | Scenario;
export type Phase = 'reference' | 'playing' | 'result' | 'complete';
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
  readonly message: string;
};

export class LaboratoryGame {
  private player = new Player();
  private scenario: Scenario = 'normal';
  private selection: ScenarioSelection = 'random';
  private phase: Phase = 'reference';
  private progress = 0;
  private pipeElapsed: number | null = null;
  private message = '';

  constructor(private readonly random: () => number = Math.random) {}

  reset(selection: ScenarioSelection = 'random'): void {
    this.selection = selection;
    this.progress = 0;
    this.startRound(selection === 'random');
  }

  face(direction: Direction): void {
    if (this.phase === 'reference' || this.phase === 'playing')
      this.player.face(direction);
  }

  jump(direction: Direction): void {
    if (this.phase === 'reference' || this.phase === 'playing')
      this.player.jump(direction);
  }

  update(seconds: number, direction: Direction): void {
    if (this.phase !== 'reference' && this.phase !== 'playing') return;
    const previousX = this.player.snapshot.x;
    this.player.update(seconds, direction);
    const { x } = this.player.snapshot;
    if (this.pipeElapsed !== null) this.pipeElapsed += seconds;
    if (
      this.scenario === 'falling-pipe' &&
      this.pipeElapsed === null &&
      Math.min(previousX, x) <= pipeX + 200 &&
      Math.max(previousX, x) >= pipeX - 200
    )
      this.pipeElapsed = 0;
    if (x <= 55) this.leave('left');
    else if (x >= world.width - 55) this.leave('right');
  }

  continue(): void {
    if (this.phase === 'complete') this.reset(this.selection);
    else if (this.phase === 'result') this.startRound(false);
  }

  private startRound(reference: boolean): void {
    this.player = new Player();
    this.pipeElapsed = null;
    this.message = '';
    this.phase = reference ? 'reference' : 'playing';
    if (reference) this.scenario = 'normal';
    else if (this.selection !== 'random') this.scenario = this.selection;
    else {
      const roll = this.random();
      this.scenario =
        roll < 0.5 ? 'normal' : roll < 0.75 ? 'giant-door' : 'falling-pipe';
    }
  }

  private leave(exit: 'left' | 'right'): void {
    if (this.phase === 'reference') {
      if (exit === 'left') {
        this.message =
          '기준 통로에는 이상이 없습니다. 오른쪽 끝까지 살펴보세요.';
        this.player = new Player();
        return;
      }
      this.message =
        '정상 통로를 확인했습니다. 이제부터 8번의 판단이 시작됩니다.';
    } else {
      const correct = (this.scenario === 'normal') === (exit === 'right');
      this.progress = correct ? this.progress + 1 : 0;
      this.message = correct
        ? '올바른 방향입니다. 다음 통로로 이동하세요.'
        : '잘못된 방향입니다. 연속 성공이 0으로 돌아갑니다.';
    }
    this.phase = this.progress === 8 ? 'complete' : 'result';
    if (this.phase === 'complete')
      this.message = '마침내, 연구소 밖의 공기가 느껴집니다.';
  }

  get snapshot(): GameSnapshot {
    return {
      player: this.player.snapshot,
      scenario: this.scenario,
      phase: this.phase,
      progress: this.progress,
      pipeElapsed: this.pipeElapsed,
      message: this.message,
    };
  }
}
