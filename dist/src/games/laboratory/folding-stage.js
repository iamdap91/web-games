export class FoldingStage {
    doorOpen = 0;
    returning = false;
    returnDoorOpen = 0;
    update(seconds, active, player, previous) {
        if (active && player.x < previous.x)
            this.returning = true;
        if (this.returning) {
            const approach = Math.max(0, Math.min(1, (850 - player.x) / 500));
            this.returnDoorOpen = Math.max(this.returnDoorOpen, Math.min(approach, this.returnDoorOpen + seconds * 0.65));
        }
        const proximity = Math.max(0, Math.min(1, (player.x - 1690) / 290));
        this.doorOpen = Math.max(this.doorOpen, Math.min(proximity, this.doorOpen + seconds * 0.65));
    }
    get snapshot() {
        return {
            doorOpen: this.doorOpen,
            returning: this.returning,
            returnDoorOpen: this.returnDoorOpen,
        };
    }
}
