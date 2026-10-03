export type AnimationFrame = {
  readonly width: number;
  readonly height: number;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly localPath: string;
  readonly durationSeconds?: number;
};

export type Animation = { readonly frames: readonly AnimationFrame[] };

type CurrentFrame = {
  readonly frame: AnimationFrame;
  readonly index: number;
  readonly totalFrames: number;
};

// 원본 재생 시간 확인 전 미리보기에만 사용하는 임시 값이다.
const frameDuration = 0.14;

export class AnimationPlayer {
  private readonly animations: ReadonlyMap<string, Animation>;
  private animation: Animation;
  private elapsed = 0;

  constructor(
    animations: ReadonlyMap<string, Animation>,
    initialMotion: string,
  ) {
    this.animations = new Map(animations);
    this.animation = this.getAnimation(initialMotion);
  }

  play(motion: string): void {
    this.animation = this.getAnimation(motion);
    this.elapsed = 0;
  }

  update(deltaSeconds: number): void {
    this.elapsed += deltaSeconds;
  }

  get currentFrame(): CurrentFrame {
    const frames = this.animation.frames;
    const total = frames.reduce(
      (sum, frame) => sum + (frame.durationSeconds ?? frameDuration),
      0,
    );
    let remaining = this.elapsed % total;
    for (const [index, frame] of frames.entries()) {
      const duration = frame.durationSeconds ?? frameDuration;
      if (remaining < duration || index === frames.length - 1) {
        return { frame, index, totalFrames: frames.length };
      }
      remaining -= duration;
    }
    throw new Error('재생할 프레임이 없습니다.');
  }

  private getAnimation(motion: string): Animation {
    const animation = this.animations.get(motion);
    if (!animation || animation.frames.length === 0) {
      throw new Error(`재생할 모션이 없습니다: ${motion}`);
    }
    return animation;
  }
}
