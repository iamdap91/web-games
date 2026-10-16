import { contactHitStopMs } from './sandbag.js';
import { collectContactCues } from './finisher-actors.js';
/** 명중한 마지막 강타만 무대를 밀며, 같은 시각의 탐색·정지에서는 같은 변위를 쓴다. */
export function sampleCameraRecoil(snapshot, impacts, options) {
    if (snapshot.waiting)
        return { x: 0, y: 0 };
    const final = collectContactCues(snapshot.motion).at(-1);
    let x = 0;
    let y = 0;
    for (const { contact, ageMs } of impacts) {
        if (!contactHitStopMs(contact, {
            finalContact: contact.actorId === final?.actorId &&
                contact.stepIndex === final.stepIndex,
        }) ||
            ageMs >= 120)
            continue;
        const envelope = (1 - ageMs / 120) ** 2;
        const recoil = 2 * options.scale * contact.strength * envelope * Math.cos(ageMs / 24);
        x += contact.directionX * recoil * (contact.directionY ? 0.3 : 1);
        y += (contact.directionY || -0.18) * recoil;
    }
    return { x, y };
}
