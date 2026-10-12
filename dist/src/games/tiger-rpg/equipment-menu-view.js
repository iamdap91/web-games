import { equipmentDefinitions, equipmentIds, equipmentSlots, } from './equipment.js';
import { equipmentGradeLabel, equipmentIconUrl, equipmentItemLabel, equipmentModeLabel, equipmentSlotLabel, } from './equipment-presentation.js';
import { SmithyMenuView } from './smithy-menu-view.js';
function textElement(tag, text, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}
/** 표시 선택만 유지하고 상태 변경·비용·저장은 호스트에 맡긴다. */
export class EquipmentMenuView {
    menu;
    context;
    options;
    smithy;
    selected;
    submitting = false;
    constructor(menu, context, options = {}) {
        this.menu = menu;
        this.context = context;
        this.options = options;
        this.smithy = new SmithyMenuView(menu, context, options);
    }
    showCraft(options) {
        this.smithy.show('craft', options);
    }
    showRefine(options) {
        this.smithy.show('refine', options);
    }
    showEquipment(options) {
        this.show(options);
    }
    show(options, message = '') {
        const state = this.context.getState();
        const ids = equipmentIds.filter((id) => state.equipment.owned[id] !== undefined);
        if (!this.selected || !ids.includes(this.selected))
            this.selected = ids[0];
        const content = document.createElement('div');
        content.className = 'equipment-menu-content';
        content.append(this.loadoutSummary(state));
        const preview = document.createElement('section');
        preview.className = 'equipment-preview';
        preview.setAttribute('aria-live', 'polite');
        content.append(preview);
        const items = ids.map((id) => ({
            id,
            label: this.choiceLabel(id, state),
            onHighlight: () => {
                this.selected = id;
                this.renderPreview(preview, id, state);
            },
            onSelect: () => this.submit(id, options),
        }));
        if (!ids.length)
            preview.append(textElement('p', '아직 보유한 장비가 없어요. 복구된 대장간에서 제작하세요.'));
        items.push({
            id: 'equipment-back',
            label: '돌아가기',
            onSelect: options.onBack,
        });
        this.menu.show({
            title: '장비',
            description: message ||
                (state.canChange
                    ? '부적 1칸 · 아대 1칸 · 장착 변경은 다음 원정부터 적용됩니다.'
                    : (state.unavailableReason ?? '마을에서 장비를 바꿀 수 있어요.')),
            content,
            layout: 'equipment',
            items,
            initialId: this.selected,
            onCancel: options.onBack,
        });
    }
    loadoutSummary(state) {
        const summary = document.createElement('div');
        summary.className = 'equipment-loadout';
        for (const slot of equipmentSlots) {
            const item = state.loadout[slot];
            const cell = document.createElement('div');
            cell.className = 'equipment-loadout-slot';
            cell.append(textElement('small', equipmentSlotLabel(slot)));
            if (item) {
                const icon = document.createElement('img');
                icon.src = equipmentIconUrl(item.id);
                icon.alt = '';
                cell.append(icon, textElement('span', equipmentItemLabel(item)));
            }
            else
                cell.append(textElement('span', '빈 슬롯'));
            summary.append(cell);
        }
        return summary;
    }
    choiceLabel(id, state) {
        const grade = state.equipment.owned[id];
        const equipped = state.loadout[equipmentDefinitions[id].slot]?.id === id;
        const status = grade === undefined ? '미보유' : equipmentGradeLabel(grade);
        const action = state.canChange ? (equipped ? '해제' : '장착') : '보기';
        return `${equipmentDefinitions[id].name} · ${status}${equipped ? ' · 장착 중' : ''} · ${action}`;
    }
    renderPreview(preview, id, state) {
        const definition = equipmentDefinitions[id];
        const grade = state.equipment.owned[id];
        const icon = document.createElement('img');
        icon.src = equipmentIconUrl(id);
        icon.alt = '';
        const heading = document.createElement('div');
        heading.className = 'equipment-preview-heading';
        const title = document.createElement('div');
        title.append(textElement('h3', definition.name), textElement('p', grade === undefined ? '미보유' : equipmentGradeLabel(grade)));
        heading.append(icon, title);
        preview.replaceChildren(heading, textElement('small', equipmentModeLabel()));
        const current = state.loadout[definition.slot];
        this.addEffect(preview, '현재 장착', current
            ? `${equipmentItemLabel(current)}\n${equipmentDefinitions[current.id].descriptions[current.grade]}`
            : `${equipmentSlotLabel(definition.slot)} 슬롯이 비어 있어요.`);
        if (grade !== undefined)
            this.addEffect(preview, '선택 장비 효과', definition.descriptions[grade]);
        preview.append(textElement('p', state.canChange
            ? current?.id === id
                ? 'Space 해제 · 이 슬롯의 효과가 사라집니다.'
                : 'Space 장착 · 같은 슬롯의 장비를 교체합니다.'
            : (state.unavailableReason ?? '마을에서 장비를 바꿀 수 있어요.'), 'equipment-action-note'));
    }
    addEffect(root, label, description) {
        const group = document.createElement('div');
        group.className = 'equipment-effect';
        group.append(textElement('small', label), textElement('p', description));
        root.append(group);
    }
    submit(id, options) {
        if (this.submitting)
            return;
        const state = this.context.getState();
        if (!state.canChange)
            return;
        const definition = equipmentDefinitions[id];
        this.submitting = true;
        try {
            const result = this.context.onEquip(definition.slot, state.loadout[definition.slot]?.id === id ? null : id);
            this.options.onChanged?.(result);
            this.show(options, result.message);
        }
        catch (error) {
            this.show(options, error instanceof Error
                ? error.message
                : '장비 요청을 완료하지 못했어요.');
        }
        finally {
            this.submitting = false;
        }
    }
}
