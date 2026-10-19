export const sourceGeometry = {
    actor: { scale: 3.8, anchor: { x: 48, y: 78 }, fist: { x: 69, y: 50 } },
    target: { scale: 1.85, face: { x: 30, y: 33 } },
    targetAnchors: [
        { x: 51, y: 62 },
        { x: 48, y: 62 },
        { x: 50, y: 59 },
        { x: 62, y: 34 },
    ],
};
const targetOrigin = { x: 590, y: 354 };
const targetAnchor = sourceGeometry.targetAnchors[1];
const actor = sourceGeometry.actor;
const target = sourceGeometry.target;
const contact = {
    x: targetOrigin.x + (target.face.x - targetAnchor.x) * target.scale,
    y: targetOrigin.y + (target.face.y - targetAnchor.y) * target.scale,
};
export const placement = {
    targetOrigin,
    contact,
    actorFeet: {
        x: contact.x - (actor.fist.x - actor.anchor.x) * actor.scale,
        y: contact.y - (actor.fist.y - actor.anchor.y) * actor.scale,
    },
};
/** 실제 정권5의 주먹 끝과 파랑 얼굴 픽셀이 같은 위치에 도달했을 때만 접촉이다. */
export function punchTouchesFace(feet, targetCenter) {
    const fistX = feet.x + (actor.fist.x - actor.anchor.x) * actor.scale;
    const fistY = feet.y + (actor.fist.y - actor.anchor.y) * actor.scale;
    const faceX = targetCenter.x + (target.face.x - targetAnchor.x) * target.scale;
    const faceY = targetCenter.y + (target.face.y - targetAnchor.y) * target.scale;
    return Math.abs(fistX - faceX) < 0.5 && Math.abs(fistY - faceY) < 0.5;
}
