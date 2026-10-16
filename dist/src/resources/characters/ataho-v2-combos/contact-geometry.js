import { groundY, startX } from './pose-drawing.js';
/** 이동 중인 자세의 타격점이며 선택한 그림의 접촉 보정도 같은 변환을 사용한다. */
export function contactPoint(pose, options) {
    const contact = pose.step.contact;
    if (!contact)
        return undefined;
    const reach = contact.reach ?? (contact.kind === 'sweep' ? 35 : 26);
    return {
        x: startX + (pose.x + reach) * options.scale,
        y: groundY +
            ((contact.heightReference === 'body' ? pose.y : 0) - contact.height) *
                options.scale,
    };
}
