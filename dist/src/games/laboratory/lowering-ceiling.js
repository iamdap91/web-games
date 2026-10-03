import { ceiling, ceilingHeight } from './event-rules.js';
import { playerBody } from './layout.js';
export class LoweringCeiling {
    slam = null;
    update(seconds, playerX) {
        if (this.slam !== null)
            this.slam += seconds;
        else if (playerX >= ceiling.trigger)
            this.slam = 0;
    }
    resolveContact(player) {
        const { x, y } = player.snapshot;
        if (x + playerBody.halfWidth < ceiling.edge)
            return false;
        if (this.slam === null) {
            player.stopAtCeiling(ceilingHeight(x, null) + 48);
            return false;
        }
        if (y - playerBody.height > ceilingHeight(x, this.slam) + 40)
            return false;
        player.squash();
        return true;
    }
    get slamElapsed() {
        return this.slam;
    }
}
