import { viewport } from './layout.js';
import { smooth } from './event-rules.js';
import { cameraPosition } from './spatial-rules.js';
export const loading = {
    wait: 3.2,
    ramp: 2,
    force: 360,
    capture: 26,
    disappear: 0.85,
};
export class LoadingWheel {
    elapsed = 0;
    phase = 'waiting';
    x = viewport.width / 2;
    caughtAt = null;
    update(seconds, player) {
        this.elapsed += seconds;
        if (this.phase === 'waiting' && this.elapsed >= loading.wait) {
            // 흡수를 시작하는 순간 화면 중앙을 공간에 고정한다. 이후 돌아서면 멀어진다.
            this.x = cameraPosition(player.x) + viewport.width / 2;
            this.phase = 'pulling';
        }
        if (this.phase === 'pulling' &&
            Math.abs(player.x - this.x) <= loading.capture) {
            this.phase = 'caught';
            this.caughtAt = this.elapsed;
        }
    }
    get snapshot() {
        return {
            phase: this.phase,
            elapsed: this.elapsed,
            x: this.x,
            strength: smooth((this.elapsed - loading.wait) / loading.ramp),
            caughtElapsed: this.caughtAt === null ? null : this.elapsed - this.caughtAt,
        };
    }
}
