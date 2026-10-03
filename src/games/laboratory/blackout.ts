export class Blackout {
  private x = 1180;

  reveal(playerX: number): void {
    this.x = playerX + 105;
  }

  update(
    previousElapsed: number | null,
    elapsed: number | null,
    playerX: number,
  ): void {
    if (
      previousElapsed !== null &&
      previousElapsed < 0.32 &&
      (elapsed ?? 0) >= 0.32
    )
      this.x = playerX + 120;
  }

  get position(): number {
    return this.x;
  }
}
