import { attackDefinition } from './attack-definitions.js';
export const attackDuration = 1.45;
export function sampleAttack(actor, elapsed, facing, move = 'basic') {
    const definition = attackDefinition(actor, move);
    const pastContacts = definition.contacts.filter((contact) => elapsed >= contact);
    const contact = pastContacts.at(-1) ?? definition.contacts[0];
    const phase = definition.phases.find(([end]) => elapsed < end)?.[1] ?? '대기';
    const keyframes = definition.bodyKeyframes?.[facing];
    const bodyProgress = keyframes
        ? keyedBodyProgress(elapsed, keyframes)
        : move !== 'basic'
            ? Math.min(1, Math.max(0, elapsed - (definition.bodyStart ?? 0)) /
                (definition.bodyDuration - (definition.bodyStart ?? 0)))
            : actor === 'biwol'
                ? facing === 'north-west'
                    ? northWestSlashProgress(elapsed)
                    : elapsed < 0.34
                        ? Math.min(0.2, elapsed * 1.5)
                        : Math.min(1, 0.2 + (elapsed - 0.34) / 0.35)
                : Math.min(1, elapsed / 0.7);
    return {
        phase,
        bodyProgress,
        contact,
        hit: pastContacts.length > 0,
        hitCount: pastContacts.length,
        contacts: definition.contacts,
        idle: phase === '대기',
    };
}
/** 원본의 사출·접촉·누른 자세를 같은 장면 시각에 놓는다. */
function keyedBodyProgress(elapsed, keys) {
    const first = keys[0];
    if (!first)
        return 0;
    if (elapsed <= first[0])
        return first[1];
    for (let index = 1; index < keys.length; index++) {
        const previous = keys[index - 1];
        const next = keys[index];
        if (elapsed > next[0])
            continue;
        const progress = (elapsed - previous[0]) / (next[0] - previous[0]);
        return previous[1] + (next[1] - previous[1]) * progress;
    }
    return keys.at(-1)[1];
}
/** 북서 원본의 준비·베기·회수 포즈를 실제 접촉에 맞춰 재배치한다. */
function northWestSlashProgress(elapsed) {
    if (elapsed < 0.34)
        return Math.min(0.19, elapsed * 1.5);
    if (elapsed < 0.48)
        return 0.1 + ((elapsed - 0.34) / 0.14) * 0.099;
    if (elapsed < 0.54)
        return 0.2 + ((elapsed - 0.48) / 0.06) * 0.199;
    if (elapsed < 0.67)
        return 0.4 + ((elapsed - 0.54) / 0.13) * 0.399;
    return Math.min(1, 0.8 + ((elapsed - 0.67) / 0.16) * 0.2);
}
/** 시간과 조작은 재생기가 소유하고 렌더러에는 읽기 전용 시점을 전달한다. */
export class AttackPlayback {
    time = 0;
    playing = true;
    repeat = true;
    speed = 1;
    duration = attackDuration;
    get elapsed() {
        return this.time;
    }
    get durationSeconds() {
        return this.duration;
    }
    get isPlaying() {
        return this.playing;
    }
    update(delta) {
        if (!this.playing)
            return;
        this.time += delta * this.speed;
        if (this.time < this.duration)
            return;
        this.time = this.repeat ? this.time % this.duration : this.duration;
        if (!this.repeat)
            this.playing = false;
    }
    selectDuration(seconds) {
        this.duration = seconds;
        this.time = 0;
        this.playing = true;
    }
    toggle() {
        if (!this.playing && this.time >= this.duration)
            this.time = 0;
        this.playing = !this.playing;
    }
    restart() {
        this.time = 0;
    }
    seek(seconds) {
        this.time = Math.max(0, Math.min(this.duration, seconds));
        this.playing = false;
    }
    step() {
        this.seek(this.time + 0.02);
    }
    setSpeed(speed) {
        this.speed = speed;
    }
    setRepeat(repeat) {
        this.repeat = repeat;
    }
}
