import { world } from './layout.js';
export const selectionTiming = {
    trigger: 1100,
    sweep: 3.6,
    pause: 0.55,
    erased: 0.85,
};
export class ScreenSelection {
    elapsed = null;
    caughtAt = null;
    update(seconds, player) {
        if (this.elapsed === null) {
            if (player.x < selectionTiming.trigger)
                return;
            this.elapsed = 0;
        }
        else
            this.elapsed += seconds;
        if (this.caughtAt === null &&
            this.deleted &&
            player.x + 18 >= this.boundary)
            this.caughtAt = this.elapsed;
    }
    get deleted() {
        return (this.elapsed !== null &&
            this.elapsed >= selectionTiming.sweep + selectionTiming.pause);
    }
    get boundary() {
        return this.elapsed === null
            ? world.width
            : 2100 - 1650 * Math.min(1, this.elapsed / selectionTiming.sweep);
    }
    get snapshot() {
        return {
            elapsed: this.elapsed,
            boundary: this.boundary,
            deleted: this.deleted,
            caughtElapsed: this.caughtAt === null ? null : this.elapsed - this.caughtAt,
        };
    }
}
