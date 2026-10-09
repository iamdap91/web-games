/** 주먹·발의 접촉점에만 금빛 궤적을 그린다. 호랑이는 진입 연출에 남겨 둔다. */
export function drawDriveStrikes(context, feedback, options) {
    for (const { impact, age, duration } of feedback.strikes) {
        const kind = impact.drive.finisher;
        const progress = age / duration;
        const fade = Math.pow(1 - progress, 1.4);
        const center = options.project(impact, impact.targetId);
        const forward = options.project({ x: impact.x + impact.aim.x, z: impact.z + impact.aim.z }, impact.targetId);
        const angle = Math.atan2(forward.y - center.y, forward.x - center.x);
        const size = Math.min(options.height * (kind ? 0.18 : 0.072), options.width * 0.22) *
            (impact.drive.beat === 1 ? 1.4 : 1);
        context.save();
        context.translate(center.x, center.y);
        context.rotate(angle);
        context.globalAlpha = fade;
        context.lineJoin = 'round';
        if (options.reducedMotion) {
            context.strokeStyle = '#ffe3a0';
            context.lineWidth = 3;
            context.beginPath();
            context.moveTo(-size * 0.16, -size * 0.16);
            context.lineTo(size * 0.16, size * 0.16);
            context.moveTo(-size * 0.16, size * 0.16);
            context.lineTo(size * 0.16, -size * 0.16);
            context.stroke();
            context.restore();
            continue;
        }
        context.strokeStyle = '#102b45';
        context.fillStyle = '#ffc65c';
        context.lineWidth = kind ? 5 : 3;
        context.beginPath();
        if (kind === 'sweep') {
            // 넓은 반달은 몸의 회전 방향으로 휘감고 끝만 빠르게 빠져나간다.
            context.rotate(-0.4 + progress * 0.7);
            context.moveTo(-size, size * 0.25);
            context.quadraticCurveTo(-size * 0.05, -size * 0.95, size, -size * 0.1);
            context.quadraticCurveTo(size * 0.05, -size * 0.44, -size, size * 0.25);
        }
        else if (kind === 'push') {
            const travel = size * progress * 0.55;
            context.moveTo(-size * 0.75 + travel, -size * 0.46);
            context.quadraticCurveTo(size * 0.95 + travel, 0, -size * 0.75 + travel, size * 0.46);
            context.quadraticCurveTo(size * 0.27 + travel, 0, -size * 0.75 + travel, -size * 0.46);
        }
        else {
            if (!kind)
                context.rotate(impact.drive.beat % 2 ? -0.45 : 0.4);
            const length = size * (kind === 'pierce' ? 1.35 : 1);
            context.moveTo(-length, -size * 0.14);
            context.lineTo(length * (0.75 + progress * 0.5), 0);
            context.lineTo(-length, size * 0.14);
            context.lineTo(-length * 0.5, 0);
        }
        context.closePath();
        context.stroke();
        context.fill();
        // 중심은 아주 짧게 밝고, 긴 잔광은 가늘게 남겨 다음 자세를 가리지 않는다.
        const flash = Math.max(0, 1 - age / (kind ? 0.085 : 0.055));
        context.globalAlpha = flash;
        context.fillStyle = '#fff4d0';
        context.beginPath();
        context.moveTo(-size * 0.38, 0);
        context.lineTo(-size * 0.07, -size * 0.07);
        context.lineTo(0, -size * 0.36);
        context.lineTo(size * 0.08, -size * 0.06);
        context.lineTo(size * 0.5, 0);
        context.lineTo(size * 0.07, size * 0.07);
        context.lineTo(0, size * 0.3);
        context.lineTo(-size * 0.06, size * 0.07);
        context.closePath();
        context.fill();
        context.globalAlpha = fade * 0.8;
        for (const outline of [true, false]) {
            context.strokeStyle = outline ? '#102b45' : '#ffdf92';
            context.lineWidth = outline ? 4 : 1.5;
            for (let ray = 0; ray < (kind ? 6 : 3); ray++) {
                const theta = (ray - (kind ? 2.5 : 1)) * 0.5;
                const inner = size * (0.2 + progress * 0.45);
                const outer = inner + size * (0.18 + (ray % 2) * 0.2) * fade;
                context.beginPath();
                context.moveTo(Math.cos(theta) * inner, Math.sin(theta) * inner);
                context.lineTo(Math.cos(theta) * outer, Math.sin(theta) * outer);
                context.stroke();
            }
        }
        context.restore();
    }
}
