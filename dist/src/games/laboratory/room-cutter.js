import { world } from './layout.js';
// 모바일에서도 반응할 여유를 주도록 절단 진행을 최초 구현의 68% 속도로 재생한다.
const cutSpeed = 0.8 * 0.85;
export const cutting = {
    trigger: 1280,
    boundaries: [1550, 1240, 930, 620, 310, 0],
    interval: 0.62 / cutSpeed,
    warning: 0.42 / cutSpeed,
    descent: 0.13 / cutSpeed,
    exit: 235,
};
export function cutImpact(index) {
    return cutting.warning + cutting.descent + index * cutting.interval;
}
export class RoomCutter {
    elapsed = null;
    count = 0;
    caughtAt = null;
    update(seconds, player) {
        if (this.elapsed === null) {
            if (player.x < cutting.trigger)
                return;
            this.elapsed = 0;
        }
        else
            this.elapsed += seconds;
        if (this.caughtAt !== null)
            return;
        while (this.count < cutting.boundaries.length &&
            this.elapsed >= cutImpact(this.count))
            this.count++;
        if (player.x >= this.boundary)
            this.caughtAt = this.elapsed;
    }
    get boundary() {
        return this.count === 0 ? world.width : cutting.boundaries[this.count - 1];
    }
    get snapshot() {
        return {
            elapsed: this.elapsed,
            count: this.count,
            boundary: this.boundary,
            caughtElapsed: this.caughtAt === null ? null : this.elapsed - this.caughtAt,
        };
    }
}
