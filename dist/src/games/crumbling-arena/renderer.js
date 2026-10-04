import { arena } from './board.js';
import { movement } from './actors.js';
const scene = {
    width: 1000,
    height: 720,
    cell: 58,
    row: 45,
    left: 123,
    top: 91,
};
function project(point) {
    return {
        x: scene.left + point.x * scene.cell,
        y: scene.top + point.y * scene.row,
    };
}
function rounded(ctx, x, y, w, h, r, fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
}
function drawTile(ctx, tile, elapsed) {
    const origin = project(tile);
    const age = elapsed - tile.changedAt;
    let y = origin.y;
    let alpha = 1;
    if (tile.state === 'gone') {
        if (age > 0.4)
            return;
        y += age * age * 800;
        alpha = Math.max(0, 1 - age / 0.4);
    }
    if (tile.state === 'repairing') {
        alpha = 1 - tile.remaining / arena.repairDelay;
        y += tile.remaining * 80;
    }
    const danger = tile.state === 'cracking';
    const progress = danger ? 1 - tile.remaining / arena.collapseDelay : 0;
    if (progress > 0.6)
        y += Math.sin(elapsed * 80 + tile.x) * progress * 1.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    const top = danger ? (progress > 0.62 ? '#a34834' : '#635143') : '#273943';
    rounded(ctx, origin.x + 2, y + 9, 54, 41, 4, danger ? '#442923' : '#14242d');
    rounded(ctx, origin.x + 2, y + 2, 54, 40, 4, tile.state === 'repairing' ? '#62c3a2' : top);
    ctx.strokeStyle = danger ? '#e9a163' : '#3b5158';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(origin.x + 8, y + 3);
    ctx.lineTo(origin.x + 49, y + 3);
    ctx.stroke();
    if (danger || tile.state === 'gone') {
        ctx.strokeStyle = progress > 0.62 ? '#ffcd91' : '#daa475';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(origin.x + 21, y + 4);
        ctx.lineTo(origin.x + 31, y + 16);
        ctx.lineTo(origin.x + 20, y + 27);
        ctx.lineTo(origin.x + 30, y + 40);
        if (progress > 0.3) {
            ctx.moveTo(origin.x + 31, y + 16);
            ctx.lineTo(origin.x + 47, y + 21);
            ctx.lineTo(origin.x + 54, y + 15);
        }
        ctx.stroke();
        if (danger)
            rounded(ctx, origin.x + 10, y + 35, 38 * (1 - progress), 2, 1, '#ffd8a0');
    }
    else {
        ctx.fillStyle = '#52616a';
        ctx.fillRect(origin.x + 9, y + 33, 2, 2);
        ctx.fillRect(origin.x + 48, y + 10, 2, 2);
    }
    ctx.restore();
}
function drawActor(ctx, actor, time) {
    const enemy = 'kind' in actor;
    const color = enemy
        ? actor.kind === 'hopper'
            ? '#b898ff'
            : '#ff746c'
        : '#b3ffdb';
    const p = project(actor);
    const jumping = enemy ? actor.jumpRemaining : actor.dashRemaining;
    const height = jumping > 0
        ? Math.sin(Math.min(1, jumping / (enemy ? 0.25 : movement.dashDuration)) *
            Math.PI) *
            27 +
            6
        : 0;
    ctx.save();
    ctx.fillStyle = '#030a0d88';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 8, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (enemy && actor.spawnRemaining > 0) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.4 + Math.sin(time * 14) * 0.2;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, 24, 17, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText('!', p.x, p.y - 15);
        ctx.restore();
        return;
    }
    ctx.translate(p.x, p.y - height);
    if (enemy && actor.jumpWarning > 0)
        ctx.scale(1.15, 0.75);
    const bob = Math.sin(time * (enemy ? 12 : 16) + actor.x) * 1.4;
    rounded(ctx, -10, -11 + bob, 8, 17, 3, enemy ? '#682f42' : '#37665d');
    rounded(ctx, 3, -11 - bob, 8, 17, 3, enemy ? '#682f42' : '#37665d');
    ctx.shadowColor = color;
    ctx.shadowBlur = enemy ? 8 : 16;
    rounded(ctx, -15, -32, 30, 26, 7, color);
    ctx.shadowBlur = 0;
    rounded(ctx, -11, -23, 22, 9, 3, '#14242d');
    ctx.fillStyle = enemy ? color : '#edfff7';
    const look = enemy ? 0 : actor.facing.x * 2;
    ctx.fillRect(-7 + look, -21, 4, enemy ? 2 : 4);
    ctx.fillRect(4 + look, -21, 4, enemy ? 2 : 4);
    if (enemy) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-14, -28);
        ctx.lineTo(-18, -39);
        ctx.lineTo(-4, -30);
        ctx.moveTo(14, -28);
        ctx.lineTo(18, -39);
        ctx.lineTo(4, -30);
        ctx.fill();
        if (actor.kind === 'hopper') {
            ctx.strokeStyle = '#eee2ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-5, -36);
            ctx.lineTo(0, -41);
            ctx.lineTo(5, -36);
            ctx.stroke();
        }
    }
    else {
        ctx.fillStyle = '#f4bd69';
        ctx.beginPath();
        ctx.moveTo(-15, -11);
        ctx.lineTo(-27, -5 + bob);
        ctx.lineTo(-23, -17);
        ctx.closePath();
        ctx.fill();
        if (actor.cooldown === 0) {
            ctx.strokeStyle = '#b3ffdb88';
            ctx.beginPath();
            ctx.ellipse(0, 8 + height, 21, 9, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    ctx.restore();
}
export function renderArena(canvas, ctx, game, time, reducedMotion) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.round(rect.width * dpr);
    const height = Math.round(rect.height * dpr);
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
    }
    ctx.setTransform(width / scene.width, 0, 0, height / scene.height, 0, 0);
    ctx.clearRect(0, 0, scene.width, scene.height);
    const gradient = ctx.createRadialGradient(500, 330, 80, 500, 340, 570);
    gradient.addColorStop(0, '#172d32');
    gradient.addColorStop(1, '#080f18');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, scene.width, scene.height);
    // 배경의 고정 별점은 화면 크기와 상관없이 같은 월드 좌표에 남는다.
    for (let i = 0; i < 70; i++) {
        const x = (i * 137.3) % 1000;
        const y = (i * 83.7) % 720;
        ctx.fillStyle = i % 3 === 0 ? '#48616c55' : '#37505b33';
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.textAlign = 'left';
    ctx.font = '11px monospace';
    ctx.fillStyle = '#6b8189';
    ctx.fillText('SECTOR 01 / THE HOLLOW', scene.left + 2, 55);
    ctx.textAlign = 'right';
    ctx.fillText('13 × 11', 875, 55);
    ctx.save();
    const lastFall = game.events.filter((event) => event.kind === 'fall').at(-1);
    const impact = lastFall ? game.elapsed - lastFall.time : 1;
    if (impact < 0.18 && !reducedMotion)
        ctx.translate(Math.sin(impact * 190) * (1 - impact / 0.18) * 3, Math.cos(impact * 170) * 2);
    ctx.strokeStyle = '#29404b';
    ctx.lineWidth = 1;
    ctx.strokeRect(scene.left - 9, scene.top - 8, arena.columns * scene.cell + 18, arena.rows * scene.row + 25);
    for (const tile of game.tiles) {
        if (tile.state === 'gone') {
            const p = project(tile);
            rounded(ctx, p.x + 5, p.y + 9, 48, 34, 3, '#060d14');
            ctx.fillStyle = '#1a2e3855';
            ctx.fillRect(p.x + 27, p.y + 24, 3, 2);
        }
    }
    for (const tile of game.tiles)
        drawTile(ctx, tile, game.elapsed);
    const actors = [...game.enemies];
    if (game.phase !== 'lost')
        actors.push(game.player);
    actors.sort((a, b) => a.y - b.y);
    for (const actor of actors)
        drawActor(ctx, actor, reducedMotion ? 0 : time);
    for (const event of game.events) {
        const age = game.elapsed - event.time;
        const p = project(event);
        if (event.kind === 'dash' && age < 0.25) {
            ctx.globalAlpha = (1 - age / 0.25) * 0.6;
            ctx.strokeStyle = '#b3ffdb';
            ctx.lineWidth = 13 * (1 - age / 0.25);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y - 17);
            const end = project(game.player);
            ctx.lineTo(end.x, end.y - 17);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        if (event.kind === 'fall') {
            ctx.globalAlpha = Math.max(0, 1 - age / 1.2);
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                ctx.fillStyle = i % 2 ? '#ffb18a' : '#b3ffdb';
                ctx.fillRect(p.x + Math.cos(angle) * age * 70, p.y + Math.sin(angle) * age * 50 + age * age * 20, 4, 4);
            }
            ctx.font = 'bold 24px monospace';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#b3ffdb';
            ctx.fillText(event.label, p.x, p.y - 32 - age * 30);
            ctx.font = '12px sans-serif';
            ctx.fillText('발판 복구 · 대시 충전', p.x, p.y - 12 - age * 30);
            ctx.globalAlpha = 1;
        }
    }
    ctx.restore();
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#82949d';
    ctx.fillText('밟으면 무너진다.   적도 예외는 없다.', 500, 646);
    const waveEvent = game.events.filter((event) => event.kind === 'wave').at(-1);
    if (waveEvent && game.elapsed - waveEvent.time < 2) {
        rounded(ctx, 337, 15, 326, 49, 10, '#14252ff0');
        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = '#e8ce9f';
        ctx.fillText(waveEvent.label, 500, 47);
    }
}
