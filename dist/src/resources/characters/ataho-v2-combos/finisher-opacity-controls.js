import { hasFinisherHierarchy } from './effect-hierarchy.js';
import { finisherOpacityControls, finisherOpacityDefaults, finisherOpacityRange, finisherOpacityValue, isFinisherOpacityKey, supportsFinisherOpacity, } from './finisher-opacity.js';
import { hasInkEffects } from './ink-effects.js';
import { inkImpactSizeMultiplier } from './ink-impact-size.js';
import { inkTrailSizeMultiplier } from './ink-trail-types.js';
function disabledReason(key, motion, options) {
    if (!options.showMovement)
        return '‘이동 포함’을 켜면 조절할 수 있습니다.';
    if (options.showFinisher === false || !options.showFinisherConcept)
        return '‘기술별 연출 → 필살기’에서 ‘기술별 컨셉’을 선택하면 조절할 수 있습니다.';
    const inkEnabled = !!options.showInkEffects && hasInkEffects(motion);
    switch (key) {
        case 'attackTrail':
        case 'movementTrail':
        case 'kiTrail':
            return inkTrailSizeMultiplier(options) > 0
                ? ''
                : '‘공통 연출’의 ‘수묵 궤적 크기’를 0보다 크게 올리면 표시됩니다.';
        case 'legacySweep':
            return inkTrailSizeMultiplier(options) === 0 &&
                options.legacyTrails === 'ink'
                ? ''
                : '‘공통 연출 → 궤적·잔상 → 이전 궤적과 비교’에서 ‘이전 먹획’을 선택하면 표시됩니다.';
        case 'inkImpact':
            if (options.showContacts &&
                inkEnabled &&
                inkImpactSizeMultiplier(options) === 0)
                return '‘공통 연출 → 명중 효과’에서 먹튀김 크기를 0보다 크게 올리면 표시됩니다.';
            return options.showContacts && inkEnabled
                ? ''
                : '‘공통 연출 → 명중 효과’에서 ‘먹튀김’을 선택하면 표시됩니다.';
        case 'hitTraces':
            if (!options.showContacts)
                return '‘공통 연출 → 명중 효과’를 켜면 표시됩니다.';
            return inkEnabled
                ? '‘공통 연출 → 명중 효과’를 ‘기본’ 또는 ‘공격별’로 바꾸면 먹튀김 대신 표시됩니다.'
                : '';
        case 'release':
            return options.showContacts
                ? ''
                : '‘공통 연출 → 명중 효과’를 켜면 표시됩니다.';
        case 'backdrop':
        case 'paths':
            return '';
    }
}
/** 행과 입력 이벤트를 소유하며, 실제 연출 설정의 변경은 화면에 요청한다. */
export class FinisherOpacityControls {
    root;
    onChange;
    rows = new Map();
    note;
    resetAll;
    events = new AbortController();
    constructor(settings) {
        this.root = settings.root;
        this.onChange = settings.onChange;
        const rows = this.root.querySelector('#finisher-opacity-rows');
        const note = this.root.querySelector('#finisher-opacity-note');
        const resetAll = this.root.querySelector('#finisher-opacity-reset-all');
        if (!rows || !note || !resetAll)
            throw new Error('필살기 농도 조절 요소를 찾을 수 없습니다.');
        this.note = note;
        this.resetAll = resetAll;
        this.resetAll.type = 'button';
        const document = this.root.ownerDocument;
        const fragment = document.createDocumentFragment();
        for (const control of finisherOpacityControls) {
            const row = document.createElement('div');
            row.className = 'finisher-opacity-row';
            row.dataset.opacityRow = control.key;
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.id = `finisher-opacity-${control.key}`;
            input.type = 'range';
            input.min = String(finisherOpacityRange.min);
            input.max = String(finisherOpacityRange.max);
            input.step = String(finisherOpacityRange.step);
            input.dataset.finisherOpacity = control.key;
            label.htmlFor = input.id;
            label.textContent = control.label;
            const output = document.createElement('output');
            output.setAttribute('for', input.id);
            const reset = document.createElement('button');
            reset.type = 'button';
            reset.dataset.opacityReset = control.key;
            reset.textContent = '초기화';
            reset.setAttribute('aria-label', `${control.label} 초기화`);
            const hint = document.createElement('p');
            hint.className = 'field-hint';
            hint.id = `${input.id}-hint`;
            input.setAttribute('aria-describedby', hint.id);
            row.append(label, input, output, reset, hint);
            fragment.append(row);
            this.rows.set(control.key, {
                root: row,
                input,
                output,
                reset,
                hint,
                description: control.description,
            });
        }
        rows.replaceChildren(fragment);
        this.root.addEventListener('input', (event) => this.handleInput(event), {
            signal: this.events.signal,
        });
        this.root.addEventListener('click', (event) => this.handleClick(event), {
            signal: this.events.signal,
        });
    }
    update(motion, options) {
        this.root.hidden = !motion.finisher;
        for (const [key, row] of this.rows) {
            row.root.hidden = !supportsFinisherOpacity(motion, key);
            const value = finisherOpacityValue(options, key);
            const label = `${Math.round(value * 100)}%`;
            row.input.value = String(Math.round(value * 100));
            row.input.setAttribute('aria-valuetext', label);
            row.output.value = label;
            const reason = disabledReason(key, motion, options);
            row.input.disabled = !!reason;
            row.hint.textContent = reason
                ? `${row.description} ${reason}`
                : row.description;
            // 적용이 막힌 모드에서도 보관한 선호를 초기화할 수 있다.
            row.reset.disabled = value === finisherOpacityDefaults[key];
        }
        this.resetAll.disabled = finisherOpacityControls.every(({ key }) => finisherOpacityValue(options, key) === finisherOpacityDefaults[key]);
        const densityNote = options.showEffectHierarchy && hasFinisherHierarchy(motion)
            ? ' ‘효과 밀도·수명 정리’가 켜져 있어 결정타 직전에는 일부 장식이 더 옅어집니다.'
            : '';
        this.note.textContent =
            '100%에서도 효과 자체의 투명도와 시간이 지나며 사라지는 표현은 유지합니다.' +
                densityNote;
    }
    dispose() {
        this.events.abort();
        for (const row of this.rows.values())
            row.root.remove();
        this.rows.clear();
    }
    handleInput(event) {
        const input = event.target;
        if (!(input instanceof HTMLInputElement) || input.disabled)
            return;
        const key = input.dataset.finisherOpacity;
        if (!isFinisherOpacityKey(key) || !Number.isFinite(input.valueAsNumber))
            return;
        const percentage = Math.max(finisherOpacityRange.min, Math.min(finisherOpacityRange.max, input.valueAsNumber));
        this.onChange({ [key]: percentage / 100 });
    }
    handleClick(event) {
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const button = target.closest('button');
        if (!button || !this.root.contains(button) || button.disabled)
            return;
        if (button === this.resetAll) {
            this.onChange({ ...finisherOpacityDefaults });
            return;
        }
        const key = button.dataset.opacityReset;
        if (isFinisherOpacityKey(key))
            this.onChange({ [key]: finisherOpacityDefaults[key] });
    }
}
