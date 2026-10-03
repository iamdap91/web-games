export class Blackout {
    x = 1180;
    reveal(playerX) {
        this.x = playerX + 105;
    }
    update(previousElapsed, elapsed, playerX) {
        if (previousElapsed !== null &&
            previousElapsed < 0.32 &&
            (elapsed ?? 0) >= 0.32)
            this.x = playerX + 120;
    }
    get position() {
        return this.x;
    }
}
