export function terrainHeight(x, y) {
    if (Math.abs(y) > 48 || x < -78 || x > 78)
        return 0;
    return Math.sin(((x + 78) / 156) * Math.PI) * 24;
}
function approachAngle(current, target) {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}
/** 운반 상태와 경사 반응을 소유한다. 화면·입력 장치에는 의존하지 않는다. */
export class CartYard {
    x = -224;
    y = 0;
    heading = 0;
    speed = 0;
    pitch = 0;
    roll = 0;
    deliveries = 0;
    loaded = true;
    reset() {
        this.x = -224;
        this.y = 0;
        this.heading = 0;
        this.speed = 0;
        this.pitch = 0;
        this.roll = 0;
        this.deliveries = 0;
        this.loaded = true;
    }
    step(seconds, input, target = null) {
        const dt = Math.min(Math.max(seconds, 0), 0.05);
        let forward = input.forward;
        let turn = input.turn;
        if (target) {
            const distance = Math.hypot(target.x - this.x, target.y - this.y);
            const difference = approachAngle(this.heading, Math.atan2(target.y - this.y, target.x - this.x));
            turn = Math.max(-1, Math.min(1, difference * 2));
            forward = distance > 12 ? Math.max(0.15, Math.cos(difference)) : 0;
        }
        this.heading += turn * dt * 1.8;
        this.speed += (forward * 105 - this.speed) * (1 - Math.exp(-dt * 5));
        this.x = Math.max(-320, Math.min(320, this.x + Math.cos(this.heading) * this.speed * dt));
        this.y = Math.max(-170, Math.min(170, this.y + Math.sin(this.heading) * this.speed * dt));
        const front = terrainHeight(this.x + Math.cos(this.heading) * 22, this.y + Math.sin(this.heading) * 22);
        const back = terrainHeight(this.x - Math.cos(this.heading) * 22, this.y - Math.sin(this.heading) * 22);
        const left = terrainHeight(this.x - Math.sin(this.heading) * 19, this.y + Math.cos(this.heading) * 19);
        const right = terrainHeight(this.x + Math.sin(this.heading) * 19, this.y - Math.cos(this.heading) * 19);
        const ease = 1 - Math.exp(-dt * 8);
        this.pitch += (Math.atan2(front - back, 44) - this.pitch) * ease;
        this.roll += (Math.atan2(left - right, 38) - this.roll) * ease;
        if (this.loaded && this.x > 230 && Math.abs(this.y) < 45) {
            this.loaded = false;
            this.deliveries++;
        }
        else if (!this.loaded && this.x < -210 && Math.abs(this.y) < 45) {
            this.loaded = true;
        }
    }
    snapshot() {
        return {
            x: this.x,
            y: this.y,
            heading: this.heading,
            speed: this.speed,
            height: terrainHeight(this.x, this.y),
            pitch: this.pitch,
            roll: this.roll,
            deliveries: this.deliveries,
            loaded: this.loaded,
        };
    }
}
