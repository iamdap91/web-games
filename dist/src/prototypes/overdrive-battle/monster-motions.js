import { animationDuration, monsterAnimations as resourceAnimations, monsterNativeFacing as resourceNativeFacing, monsterAttackAnimation, } from '../../resources/monsters/monster-motions.js';
import { monsterDefinition } from './monster-catalog.js';
export { animationDuration, monsterMotionFrame, monsterMotionNames, } from '../../resources/monsters/monster-motions.js';
export function monsterAnimations(id) {
    return resourceAnimations(monsterDefinition(id));
}
export function monsterNativeFacing(id) {
    return resourceNativeFacing(monsterDefinition(id));
}
function contactAge(animation) {
    const index = animation.contactFrameIndex;
    if (typeof index === 'number' &&
        Number.isInteger(index) &&
        index >= 0 &&
        index < animation.frames.length)
        return animation.frames
            .slice(0, index)
            .reduce((sum, frame) => sum + (frame.durationSeconds ?? 0.14), 0);
    const progress = animation.contactProgress;
    if (typeof progress === 'number' &&
        Number.isFinite(progress) &&
        progress >= 0 &&
        progress < 1)
        return animationDuration(animation) * progress;
    throw new Error('몬스터 공격 접촉 정보가 없습니다.');
}
export function monsterAttackPlan(id) {
    const definition = monsterDefinition(id);
    const role = definition.role;
    const mode = role === 'ranged' || role === 'support' ? 'ranged' : 'melee';
    const arrivalTime = mode === 'ranged' ? 0 : role === 'rusher' ? 0.095 : 0.14;
    const returnDuration = mode === 'ranged' ? 0 : role === 'rusher' ? 0.085 : 0.12;
    const animation = monsterAttackAnimation(definition);
    // 리소스 이전의 로직 검사도 가능하지만 실제 화면은 모든 프레임·방향·접촉 정보를 요구한다.
    const duration = animation ? animationDuration(animation) : 0.65;
    const contactTime = animation ? contactAge(animation) : 0.36;
    return {
        mode,
        arrivalTime,
        returnTime: arrivalTime + duration,
        duration: arrivalTime + duration + returnDuration,
        contactTime: arrivalTime + contactTime,
    };
}
