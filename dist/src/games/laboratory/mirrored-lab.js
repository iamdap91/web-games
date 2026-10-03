import { roomFlip } from './event-rules.js';
export class MirroredLab {
    elapsed = null;
    flipFinishX = null;
    update(seconds, activeElapsed, playerX) {
        if ((activeElapsed ?? 0) < roomFlip.duration)
            return;
        this.flipFinishX ??= playerX;
        if (this.elapsed !== null)
            this.elapsed += seconds;
        else if (Math.abs(playerX - this.flipFinishX) >= roomFlip.returnDistance)
            this.elapsed = 0;
    }
    get mirrorElapsed() {
        return this.elapsed;
    }
}
