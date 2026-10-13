import { groundY, sceneSize, } from './creature.js';
function polygon(ctx, points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index === 0)
            ctx.moveTo(Math.round(point.x), Math.round(point.y));
        else
            ctx.lineTo(Math.round(point.x), Math.round(point.y));
    });
    ctx.closePath();
    ctx.fill();
}
function segment(ctx, points, color, width) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    points.forEach((point, index) => {
        if (index === 0)
            ctx.moveTo(Math.round(point.x), Math.round(point.y));
        else
            ctx.lineTo(Math.round(point.x), Math.round(point.y));
    });
    ctx.stroke();
}
function forest(ctx) {
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#223f3b');
    sky.addColorStop(0.65, '#66886c');
    sky.addColorStop(1, '#a4ad75');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, sceneSize.width, sceneSize.height);
    ctx.fillStyle = '#f0db94';
    ctx.beginPath();
    ctx.arc(346, 47, 23, 0, Math.PI * 2);
    ctx.fill();
    polygon(ctx, [
        { x: 323, y: 43 },
        { x: 350, y: 43 },
        { x: 421, y: 202 },
        { x: 352, y: 202 },
    ], '#efd89114');
    polygon(ctx, [
        { x: 350, y: 35 },
        { x: 361, y: 35 },
        { x: 472, y: 202 },
        { x: 415, y: 202 },
    ], '#efd8910c');
    for (let layer = 0; layer < 3; layer++) {
        const colors = ['#497264', '#315b50', '#244b43'];
        for (let index = 0; index < 12; index++) {
            const x = index * 49 + layer * 17 - 30;
            const top = 20 + ((index * 37 + layer * 13) % 75);
            const width = 18 + layer * 10;
            ctx.fillStyle = colors[layer] ?? '#315b50';
            ctx.fillRect(x - 3, top + 20, 7, groundY - top);
            for (let tier = 0; tier < 3; tier++) {
                polygon(ctx, [
                    { x, y: top + tier * 18 },
                    { x: x - width - tier * 4, y: top + 55 + tier * 20 },
                    { x: x + width + tier * 4, y: top + 55 + tier * 20 },
                ], colors[layer] ?? '#315b50');
            }
        }
    }
    ctx.fillStyle = '#172f29';
    ctx.fillRect(0, groundY + 1, sceneSize.width, sceneSize.height - groundY);
    ctx.fillStyle = '#4a5c38';
    ctx.fillRect(0, groundY, sceneSize.width, 5);
    ctx.fillStyle = '#738548';
    ctx.fillRect(0, groundY, sceneSize.width, 2);
    for (let index = 0; index < 96; index++) {
        const x = (index * 83) % sceneSize.width;
        const y = groundY + 9 + ((index * 29) % 48);
        ctx.fillStyle = index % 3 === 0 ? '#3c4c32' : '#273b2b';
        ctx.fillRect(x, y, 2 + (index % 3), 1);
    }
    for (let index = 0; index < 28; index++) {
        const x = (index * 71 + 11) % sceneSize.width;
        ctx.fillStyle = index % 3 === 0 ? '#93a756' : '#577244';
        ctx.fillRect(x, groundY - 4, 1, 4);
        ctx.fillRect(x + 2, groundY - 2, 2, 2);
    }
    for (const x of [26, 53, 429, 453]) {
        ctx.fillStyle = '#d8bd8c';
        ctx.fillRect(x, groundY - 5, 2, 5);
        ctx.fillStyle = '#c17b55';
        ctx.fillRect(x - 3, groundY - 8, 8, 3);
        ctx.fillStyle = '#f2d5a2';
        ctx.fillRect(x - 1, groundY - 8, 2, 1);
    }
}
function rocks(ctx, pose, selectedRock) {
    for (const rock of pose.rocks) {
        const left = rock.x - rock.width / 2;
        const right = rock.x + rock.width / 2;
        const top = groundY - rock.height;
        polygon(ctx, [
            { x: left - 3, y: groundY },
            { x: left + rock.width * 0.36, y: top - 2 },
            { x: right - rock.width * 0.36, y: top - 2 },
            { x: right + 3, y: groundY },
        ], '#243c37');
        polygon(ctx, [
            { x: left, y: groundY },
            { x: left + rock.width * 0.36, y: top },
            { x: right - rock.width * 0.36, y: top },
            { x: right, y: groundY },
        ], '#788479');
        polygon(ctx, [
            { x: left, y: groundY },
            { x: rock.x, y: top },
            { x: rock.x + 6, y: groundY },
        ], '#8e9786');
        polygon(ctx, [
            { x: rock.x + 5, y: top },
            { x: right - rock.width * 0.36, y: top },
            { x: right, y: groundY },
            { x: rock.x + 15, y: groundY - 7 },
        ], '#606f67');
        segment(ctx, [
            { x: left + rock.width * 0.36, y: top },
            { x: right - rock.width * 0.36, y: top },
        ], '#bed0a0', 2);
        ctx.fillStyle = '#729155';
        ctx.fillRect(Math.round(rock.x - 10), top - 1, 12, 2);
        ctx.fillRect(Math.round(rock.x - 8), top - 3, 4, 2);
        if (rock.id === selectedRock) {
            ctx.strokeStyle = '#f2d187';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(Math.round(left) - 3, top - 8, rock.width + 6, rock.height + 10);
            ctx.setLineDash([]);
        }
    }
}
function leg(ctx, pose, index) {
    const item = pose.legs[index];
    if (!item)
        return;
    const points = [item.hip, item.knee, item.foot];
    segment(ctx, points, '#183a30', 6);
    segment(ctx, points, item.far ? '#47804a' : '#83b557', 3);
    segment(ctx, [
        { x: item.foot.x - 3, y: item.foot.y },
        { x: item.foot.x + 5, y: item.foot.y },
    ], '#c1cb71', 2);
}
function creature(ctx, pose) {
    const shadowX = pose.body.x;
    ctx.fillStyle = '#122e2655';
    ctx.beginPath();
    ctx.ellipse(shadowX, groundY + 2, 48, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    leg(ctx, pose, 2);
    leg(ctx, pose, 3);
    for (let index = 1; index < pose.tail.length; index++) {
        const previous = pose.tail[index - 1];
        const current = pose.tail[index];
        if (!previous || !current)
            continue;
        const width = 11 - index;
        segment(ctx, [previous, current], '#183a30', width + 2);
        segment(ctx, [previous, current], '#73a64e', width);
        segment(ctx, [
            { x: previous.x, y: previous.y - 1 },
            { x: current.x, y: current.y - 1 },
        ], '#afc567', Math.max(1, width - 4));
    }
    ctx.save();
    ctx.translate(Math.round(pose.body.x), Math.round(pose.body.y));
    ctx.rotate(pose.angle);
    ctx.scale(pose.facing, 1);
    ctx.fillStyle = '#183a30';
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#86b456';
    ctx.beginPath();
    ctx.ellipse(0, -1, 32, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c3cc78';
    ctx.beginPath();
    ctx.ellipse(3, 6, 28, 5, 0, 0, Math.PI);
    ctx.fill();
    for (const x of [-23, -11, 1, 13]) {
        ctx.fillStyle = '#456e41';
        ctx.fillRect(x, -6, 6, 3);
        ctx.fillStyle = '#b9ca6e';
        ctx.fillRect(x + 2, -9, 3, 2);
    }
    polygon(ctx, [
        { x: 23, y: -7 },
        { x: 29, y: -17 },
        { x: 46, y: -17 },
        { x: 54, y: -7 },
        { x: 53, y: 2 },
        { x: 30, y: 4 },
    ], '#183a30');
    polygon(ctx, [
        { x: 26, y: -7 },
        { x: 30, y: -15 },
        { x: 45, y: -15 },
        { x: 51, y: -6 },
        { x: 50, y: 0 },
        { x: 30, y: 1 },
    ], '#94c15f');
    ctx.fillStyle = '#d7d78a';
    ctx.fillRect(32, -2, 18, 3);
    ctx.fillStyle = '#e4dfa0';
    ctx.fillRect(36, -13, 7, 7);
    ctx.fillStyle = '#192e26';
    ctx.fillRect(40, -12, 3, 5);
    ctx.fillRect(48, -7, 2, 2);
    ctx.fillRect(43, -1, 9, 1);
    ctx.fillStyle = '#bdd16e';
    ctx.fillRect(31, -15, 5, 2);
    ctx.restore();
    leg(ctx, pose, 0);
    leg(ctx, pose, 1);
    if (pose.pushFlash > 0) {
        const side = pose.body.x + pose.facing * 67;
        const alpha = Math.min(1, pose.pushFlash * 2);
        ctx.globalAlpha = alpha;
        segment(ctx, [
            { x: side + pose.facing * 11, y: pose.body.y - 7 },
            { x: side - pose.facing * 3, y: pose.body.y - 7 },
        ], '#f4c679', 3);
        segment(ctx, [
            { x: side, y: pose.body.y - 13 },
            { x: side - pose.facing * 6, y: pose.body.y - 7 },
            { x: side, y: pose.body.y - 1 },
        ], '#f4c679', 3);
        ctx.globalAlpha = 1;
    }
}
export function drawScene(ctx, pose, options) {
    ctx.clearRect(0, 0, sceneSize.width, sceneSize.height);
    forest(ctx);
    rocks(ctx, pose, options.selectedRock);
    creature(ctx, pose);
    if (!options.skeleton)
        return;
    for (const item of pose.legs) {
        segment(ctx, [item.hip, item.knee, item.foot], item.far ? '#76c5d1' : '#fff2a9', 1);
        for (const point of [item.hip, item.knee, item.foot]) {
            ctx.fillStyle = item.stepping ? '#f3b66b' : '#f5edaf';
            ctx.fillRect(Math.round(point.x) - 1, Math.round(point.y) - 1, 3, 3);
        }
    }
    segment(ctx, pose.tail, '#d8aaed', 1);
}
