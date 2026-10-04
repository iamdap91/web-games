import { arena, Board, distance } from './board.js';
import { Enemy, Player } from './actors.js';
function newRun() {
    return {
        board: new Board(),
        player: new Player(),
        enemies: [],
        phase: 'ready',
        elapsed: 0,
        kills: 0,
        spawnIn: 0.6,
        nextId: 0,
        events: [],
        cause: '',
        wave: 1,
    };
}
export class ArenaGame {
    random;
    run = newRun();
    constructor(random = Math.random) {
        this.random = random;
    }
    get snapshot() {
        const run = this.run;
        return {
            phase: run.phase,
            elapsed: run.elapsed,
            kills: run.kills,
            score: run.kills * 100 + Math.floor(run.elapsed * 10),
            wave: run.wave,
            cause: run.cause,
            player: run.player.snapshot,
            tiles: run.board.snapshot,
            enemies: run.enemies.map((enemy) => enemy.snapshot),
            events: [...run.events],
        };
    }
    start() {
        this.run = newRun();
        this.run.phase = 'playing';
        this.run.board.step(this.run.player.snapshot, 0);
    }
    dash(input) {
        if (this.run.phase !== 'playing' || !this.run.player.dash(input))
            return;
        this.emit(this.run.player.snapshot, 'dash', '');
    }
    update(dt, input) {
        const run = this.run;
        if (run.phase !== 'playing')
            return;
        // 긴 프레임에서도 타일이나 적을 건너뛰지 않도록 같은 규칙을 작은 간격으로 실행한다.
        let remaining = Math.min(0.1, Math.max(0, dt));
        while (remaining > 0 && run.phase === 'playing') {
            const step = Math.min(remaining, 1 / 120);
            this.advance(step, input);
            remaining -= step;
        }
    }
    advance(dt, input) {
        const run = this.run;
        run.elapsed += dt;
        run.board.update(dt, run.elapsed);
        if (!run.player.update(dt, input, run.board, run.elapsed)) {
            this.lose('발판이 무너졌어요');
            return;
        }
        const player = run.player.snapshot;
        const survivors = [];
        for (const enemy of run.enemies) {
            const result = enemy.update(dt, player, run.board, run.elapsed);
            if (result === 'fell') {
                run.kills++;
                run.board.repairNear(player, run.elapsed, 5);
                run.player.recharge();
                this.emit(enemy.snapshot, 'fall', '+100');
            }
            else if (result === 'alive') {
                survivors.push(enemy);
                if (enemy.touches(run.player.snapshot)) {
                    this.lose('추격자에게 잡혔어요');
                    break;
                }
            }
        }
        run.enemies = survivors;
        if (run.phase !== 'playing')
            return;
        const wave = Math.min(3, Math.floor(run.elapsed / 20) + 1);
        if (wave > run.wave) {
            run.wave = wave;
            run.board.repairNear(player, run.elapsed, 14);
            this.emit(player, 'wave', wave === 2 ? '점프하는 적 등장' : '마지막 20초');
        }
        run.spawnIn -= dt;
        if (run.spawnIn <= 0) {
            this.spawnEnemy();
            run.spawnIn = Math.max(0.85, 2.4 - run.elapsed * 0.024);
        }
        if (run.elapsed >= arena.duration) {
            run.elapsed = arena.duration;
            run.phase = 'won';
        }
        run.events = run.events.filter((event) => run.elapsed - event.time < 2.2);
    }
    spawnEnemy() {
        const run = this.run;
        if (run.enemies.length >= 8)
            return;
        const player = run.player.snapshot;
        const candidates = run.board.snapshot.filter((tile) => tile.state === 'solid' &&
            distance({ x: tile.x + 0.5, y: tile.y + 0.5 }, player) >= 4 &&
            run.enemies.every((enemy) => distance(enemy.snapshot, { x: tile.x + 0.5, y: tile.y + 0.5 }) >
                1.3));
        const tile = candidates[Math.floor(this.random() * candidates.length)];
        if (!tile)
            return;
        const id = run.nextId++;
        run.enemies.push(new Enemy(id, run.wave >= 2 && id % 3 === 0 ? 'hopper' : 'chaser', {
            x: tile.x + 0.5,
            y: tile.y + 0.5,
        }));
    }
    lose(cause) {
        this.run.phase = 'lost';
        this.run.cause = cause;
    }
    emit(point, kind, label) {
        this.run.events.push({
            x: point.x,
            y: point.y,
            id: this.run.nextId++,
            kind,
            label,
            time: this.run.elapsed,
        });
    }
}
