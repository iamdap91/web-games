import { trailBounds } from '../../../games/tiger-rpg/trail-topology.js';
/** 상단 지도는 실제 경로·개방 상태에서 그려 별도의 길 안내 데이터를 유지하지 않는다. */
export function drawAtlasMap(canvas, map, state, options) {
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    const width = 216, height = 170, dpr = Math.min(devicePixelRatio || 1, 2);
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const bounds = trailBounds(map), padding = 12;
    const scale = Math.min((width - padding * 2) / (bounds.maxX - bounds.minX), (height - padding * 2) / (bounds.maxZ - bounds.minZ));
    const ox = (width - (bounds.maxX - bounds.minX) * scale) / 2, oy = (height - (bounds.maxZ - bounds.minZ) * scale) / 2;
    const x = (v) => ox + (v - bounds.minX) * scale, y = (v) => oy + (v - bounds.minZ) * scale;
    ctx.strokeStyle = '#beb399';
    ctx.fillStyle = '#8a9580';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const clearing of map.clearings) {
        ctx.beginPath();
        ctx.arc(x(clearing.x), y(clearing.z), clearing.radius * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    for (const route of map.routes) {
        const closed = route.shortcut && !state.shortcutOpened;
        ctx.beginPath();
        route.points.forEach((p, i) => {
            if (i)
                ctx.lineTo(x(p.x), y(p.z));
            else
                ctx.moveTo(x(p.x), y(p.z));
        });
        ctx.lineWidth = closed ? 1.4 : route.halfWidth * 2 * scale;
        ctx.strokeStyle = closed ? '#b99b73' : '#b6b099';
        ctx.setLineDash(closed ? [3, 4] : []);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = '#596d64';
    for (const obstacle of map.obstacles) {
        ctx.beginPath();
        ctx.arc(x(obstacle.x), y(obstacle.z), obstacle.radius * scale, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = '#657365';
    ctx.lineWidth = 3;
    for (const wall of map.walls) {
        ctx.beginPath();
        ctx.moveTo(x(wall.from.x), y(wall.from.z));
        ctx.lineTo(x(wall.to.x), y(wall.to.z));
        ctx.stroke();
    }
    if (options.showBattles) {
        ctx.strokeStyle = '#d3b478';
        ctx.lineWidth = 1;
        for (const area of map.battleAreas) {
            ctx.beginPath();
            ctx.arc(x(area.x), y(area.z), area.radius * scale, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    for (const point of map.points) {
        ctx.fillStyle = state.surveyed.includes(point.id)
            ? '#779c84'
            : point.kind === 'cache'
                ? '#ddd0a0'
                : '#f1e7c8';
        ctx.beginPath();
        ctx.arc(x(point.x), y(point.z), point.kind === 'mechanism' ? 4 : 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#374e43';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    ctx.fillStyle = '#ece4ce';
    ctx.fillRect(x(map.entrance.x) - 3, y(map.entrance.z) - 2, 6, 4);
    ctx.fillStyle = '#f1b369';
    ctx.strokeStyle = '#4b513d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x(state.player.x), y(state.player.z), 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
}
