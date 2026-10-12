import { dojoLayout } from './dojo-layout.js';
import { basecampLayout } from '../../maps/basecamp/basecamp-layout.js';
// 앉은 주인의 발밑 판정과 외형은 같은 반경을 사용한다. 대화 역할은 외형과 분리한다.
export const dojoConversation = {
    ownerRadius: 0.52,
    owner: { x: basecampLayout.placements.dojo.x + 1.7, y: 0, z: 2.7 },
    player: { x: basecampLayout.placements.dojo.x - 0.7, z: 3.2 },
    focus: { x: basecampLayout.placements.dojo.x + 0.5, z: 2.8 },
};
/** 대화에서는 얼굴이 보이도록 정면을 유지하면서 상대 쪽으로만 사선을 고른다. */
export function dojoDialogueFacing(player) {
    const dx = dojoConversation.owner.x - player.x;
    const dz = dojoConversation.owner.z - player.z;
    const horizontal = dx * Math.cos(dojoLayout.cameraYaw) - dz * Math.sin(dojoLayout.cameraYaw);
    if (Math.abs(horizontal) < 0.35)
        return 'front';
    return horizontal < 0 ? 'front-left' : 'front-right';
}
