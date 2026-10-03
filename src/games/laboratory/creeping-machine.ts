import type { PlayerSnapshot } from './player.js';

export class CreepingMachine {
  private x = 1420;
  private lean = 0;
  private stride = 0;
  private unwatchedElapsed = 0;
  private approaches = 0;
  private wasUnwatched = false;

  update(seconds: number, player: PlayerSnapshot): void {
    const distance = player.x - this.x;
    const unwatched = distance * player.facing > 0;
    if (unwatched && !this.wasUnwatched) this.approaches++;
    this.unwatchedElapsed = unwatched ? this.unwatchedElapsed + seconds : 0;
    const moving =
      unwatched && this.unwatchedElapsed > 0.18 && Math.abs(distance) > 90;
    const speed = moving
      ? Math.sign(distance) * Math.min(400, 170 + this.approaches * 75)
      : 0;
    const travel =
      Math.sign(speed) *
      Math.min(Math.abs(speed) * seconds, Math.max(0, Math.abs(distance) - 90));
    this.x += travel;
    this.stride += Math.abs(travel) / 45;
    this.lean +=
      ((moving ? -Math.sign(speed) * 0.055 : 0) - this.lean) *
      Math.min(1, seconds * (moving ? 5 : 12));
    this.wasUnwatched = unwatched;
  }

  get snapshot(): {
    readonly x: number;
    readonly lean: number;
    readonly stride: number;
  } {
    return { x: this.x, lean: this.lean, stride: this.stride };
  }
}
