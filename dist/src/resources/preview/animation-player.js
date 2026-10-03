// 원본 재생 시간 확인 전 미리보기에만 사용하는 임시 값이다.
const frameDuration = 0.14;
export class AnimationPlayer {
    animations;
    animation;
    elapsed = 0;
    constructor(animations, initialMotion) {
        this.animations = new Map(animations);
        this.animation = this.getAnimation(initialMotion);
    }
    play(motion) {
        this.animation = this.getAnimation(motion);
        this.elapsed = 0;
    }
    update(deltaSeconds) {
        this.elapsed += deltaSeconds;
    }
    get currentFrame() {
        const frames = this.animation.frames;
        const total = frames.reduce((sum, frame) => sum + (frame.durationSeconds ?? frameDuration), 0);
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
    getAnimation(motion) {
        const animation = this.animations.get(motion);
        if (!animation || animation.frames.length === 0) {
            throw new Error(`재생할 모션이 없습니다: ${motion}`);
        }
        return animation;
    }
}
