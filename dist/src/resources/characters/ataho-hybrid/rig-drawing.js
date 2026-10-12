// 부위 간격이 일정하지 않아 시트에서 각 그림의 범위를 따로 지정한다.
export const rigParts = {
    head: { source: [6, 37, 354, 328], size: [66, 51], anchor: [33, 49] },
    torso: { source: [360, 75, 306, 270], size: [46, 42], anchor: [23, 0] },
    tail: { source: [666, 95, 241, 234], size: [42, 41], anchor: [6, 32] },
    pelvis: { source: [907, 124, 279, 265], size: [47, 30], anchor: [23.5, 0] },
    leftUpperArm: { source: [56, 396, 174, 280], size: [20, 30], anchor: [9, 5] },
    rightUpperArm: {
        source: [375, 395, 204, 278],
        size: [22, 30],
        anchor: [12, 5],
    },
    leftForearm: { source: [681, 418, 138, 255], size: [14, 25], anchor: [7, 6] },
    rightForearm: {
        source: [980, 418, 136, 254],
        size: [14, 25],
        anchor: [7, 6],
    },
    leftFist: { source: [100, 751, 161, 184], size: [16, 13], anchor: [8, 2] },
    rightFist: { source: [364, 752, 162, 183], size: [16, 13], anchor: [8, 2] },
    leftThigh: { source: [636, 693, 198, 267], size: [29, 32], anchor: [14, 5] },
    rightThigh: { source: [963, 693, 197, 267], size: [29, 32], anchor: [15, 5] },
    leftFoot: { source: [47, 1007, 197, 223], size: [25, 23], anchor: [12, 6] },
    rightFoot: { source: [357, 1006, 213, 219], size: [26, 23], anchor: [13, 6] },
};
function part(context, sheet, name) {
    const { source, size, anchor } = rigParts[name];
    context.drawImage(sheet, source[0], source[1], source[2], source[3], -anchor[0], -anchor[1], size[0], size[1]);
}
function bone(context, transform, draw) {
    context.save();
    context.translate(transform.x, transform.y);
    context.rotate(transform.angle);
    draw();
    context.restore();
}
function drawLeg(context, sheet, side, pose, showBones) {
    const left = side === 'left';
    bone(context, { x: left ? -14 : 14, y: 89, angle: left ? pose.leftLeg : pose.rightLeg }, () => {
        part(context, sheet, left ? 'leftThigh' : 'rightThigh');
        if (showBones)
            drawBone(context, 22);
        bone(context, { x: 0, y: 22, angle: left ? pose.leftKnee : pose.rightKnee }, () => {
            part(context, sheet, left ? 'leftFoot' : 'rightFoot');
            if (showBones)
                drawBone(context, 16);
        });
    });
}
function drawArm(context, sheet, side, pose, showBones) {
    const left = side === 'left';
    bone(context, { x: left ? -25 : 25, y: 51, angle: left ? pose.leftArm : pose.rightArm }, () => {
        part(context, sheet, left ? 'leftUpperArm' : 'rightUpperArm');
        if (showBones)
            drawBone(context, 20);
        bone(context, { x: 0, y: 20, angle: left ? pose.leftElbow : pose.rightElbow }, () => {
            part(context, sheet, left ? 'leftForearm' : 'rightForearm');
            if (showBones)
                drawBone(context, 16);
            bone(context, { x: 0, y: 16, angle: 0 }, () => {
                part(context, sheet, left ? 'leftFist' : 'rightFist');
            });
        });
    });
}
function drawBone(context, length) {
    context.strokeStyle = '#64fcd7';
    context.fillStyle = '#ffd277';
    context.lineWidth = 0.65;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, length);
    context.stroke();
    context.beginPath();
    context.arc(0, 0, 1.1, 0, Math.PI * 2);
    context.fill();
}
/** 팔·다리를 부모 관절 아래에서 합성하고 접촉 때만 큰 전신 자세로 바꾼다. */
export function drawHybrid(context, images, pose, showBones) {
    if (pose.attachment !== 'rig') {
        const punch = pose.attachment === 'punch';
        const source = punch
            ? [34, 42, 1156, 1194]
            : [32, 39, 1148, 1207];
        const scale = 128 / source[3];
        const footX = punch ? 570 : 470;
        context.drawImage(punch ? images.punch : images.kick, source[0], source[1], source[2], source[3], -(footX - source[0]) * scale, 0, source[2] * scale, 128);
        if (showBones) {
            context.strokeStyle = '#ffd277';
            context.lineWidth = 0.8;
            context.strokeRect(-(footX - source[0]) * scale, 0, source[2] * scale, 128);
        }
        return;
    }
    const sheet = images.parts;
    context.save();
    context.translate(0, pose.bob);
    context.scale(pose.turn, 1);
    bone(context, { x: -20, y: 104, angle: pose.tail }, () => {
        context.scale(-1, 1);
        part(context, sheet, 'tail');
    });
    drawLeg(context, sheet, 'left', pose, showBones);
    drawLeg(context, sheet, 'right', pose, showBones);
    bone(context, { x: 0, y: 83, angle: pose.lean }, () => {
        context.translate(0, -83);
        drawArm(context, sheet, 'left', pose, showBones);
        drawArm(context, sheet, 'right', pose, showBones);
        bone(context, { x: 0, y: 43, angle: 0 }, () => part(context, sheet, 'torso'));
        bone(context, { x: 0, y: 79, angle: pose.tail * 0.18 }, () => part(context, sheet, 'pelvis'));
        bone(context, { x: 0, y: 47.8, angle: -pose.lean * 0.3 }, () => {
            // 얼굴은 새로 생성한 분리 시안 대신 승인 원화의 픽셀을 그대로 표시한다.
            context.drawImage(images.front, 322, 18, 647, 468, -33, -47.8, 66, 47.8);
        });
        if (showBones)
            bone(context, { x: 0, y: 45, angle: 0 }, () => drawBone(context, 38));
    });
    context.restore();
}
