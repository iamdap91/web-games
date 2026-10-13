import { cardinalFacing, facingFor } from '../../characters/ataho/facing.js';
/** 승인 원본의 정면 이름은 stand/move이고 나머지 방향만 접미사를 가진다. */
export function motionFor(direction, moving) {
    const facing = cardinalFacing(facingFor(direction));
    const action = moving ? 'move' : 'stand';
    return facing === 'front' ? action : `${action}-${facing}`;
}
