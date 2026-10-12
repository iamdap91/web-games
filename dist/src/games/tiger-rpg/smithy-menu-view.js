import { equipmentDefinitions, } from './equipment.js';
import { equipmentGradeLabel, equipmentIconUrl, equipmentModeLabel, } from './equipment-presentation.js';
import { smithyItems, smithyOffer, } from './smithy-presentation.js';
function textElement(tag, text, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}
/** 작업 선택과 결과 표시만 소유한다. 제작·강화·재료 소모는 호스트가 결정한다. */
export class SmithyMenuView {
    menu;
    context;
    options;
    selected;
    submitting = false;
    feedback = null;
    constructor(menu, context, options = {}) {
        this.menu = menu;
        this.context = context;
        this.options = options;
    }
    show(work, options) {
        const state = this.context.getState();
        const ids = smithyItems(work, state);
        if (!this.selected || !ids.includes(this.selected))
            this.selected = ids[0];
        const preview = document.createElement('section');
        preview.className = 'equipment-preview smithy-preview';
        preview.setAttribute('aria-live', 'polite');
        const items = ids.map((id) => ({
            id,
            label: `${equipmentDefinitions[id].name} · ${smithyOffer(id, work, state).status}`,
            content: this.choiceContent(id, work, state),
            interaction: 'preview',
            onHighlight: () => {
                this.selected = id;
                this.renderPreview(preview, id, work, state);
                this.menu.updateItem(this.actionItem(work, options, state));
            },
            onSelect: () => this.menu.focusItem('smithy-action'),
        }));
        if (!ids.length)
            preview.append(textElement('p', '강화할 장비가 없어요. 먼저 대장장이에게 장비를 제작하세요.'));
        items.push(this.actionItem(work, options, state), {
            id: 'smithy-back',
            label: '돌아가기',
            onSelect: options.onBack,
        });
        this.menu.show({
            title: work === 'craft' ? '장비 제작' : '장비 강화',
            description: work === 'craft'
                ? '장비를 골라 제작 결과와 필요한 재료를 확인하세요.'
                : '보유 장비를 골라 강화 전후의 효과를 비교하세요.',
            content: preview,
            layout: 'smithy',
            items,
            initialId: this.selected,
            hint: '↑↓ 선택 · → / Space 버튼 이동 · Space 실행 · Esc 돌아가기',
            onCancel: options.onBack,
        });
    }
    icon(id) {
        const icon = document.createElement('img');
        icon.src = equipmentIconUrl(id);
        icon.alt = '';
        return icon;
    }
    choiceContent(id, work, state) {
        const row = document.createElement('span');
        row.className = 'smithy-choice';
        const text = document.createElement('span');
        text.append(textElement('span', equipmentDefinitions[id].name, 'smithy-choice-name'), textElement('small', smithyOffer(id, work, state).status));
        row.append(this.icon(id), text);
        return row;
    }
    actionItem(work, options, state) {
        const offer = this.selected
            ? smithyOffer(this.selected, work, state)
            : null;
        const label = work === 'craft' ? '제작하기' : '강화하기';
        const content = document.createElement('span');
        content.className = 'smithy-action';
        content.append(textElement('strong', `${label} · Space`), textElement('small', offer?.reason ??
            (work === 'craft'
                ? '빈 슬롯에는 제작한 장비가 바로 장착됩니다.'
                : '현재 장착을 유지하며 등급만 올립니다.')));
        return {
            id: 'smithy-action',
            label: `${label}${offer?.reason ? ` · ${offer.reason}` : ''}`,
            content,
            placement: 'action',
            hidden: !offer || offer.targetGrade === null,
            disabled: !offer?.canExecute,
            onSelect: () => {
                if (this.selected)
                    this.submit(this.selected, work, options);
            },
        };
    }
    renderPreview(preview, id, work, state) {
        const offer = smithyOffer(id, work, state);
        const heading = document.createElement('div');
        heading.className = 'equipment-preview-heading';
        const title = document.createElement('div');
        title.append(textElement('h3', equipmentDefinitions[id].name), textElement('small', equipmentModeLabel()));
        heading.append(this.icon(id), title);
        preview.replaceChildren(heading);
        if (work === 'refine' && offer.grade === 1) {
            const comparison = document.createElement('div');
            comparison.className = 'smithy-comparison';
            comparison.append(this.gradeCard(id, 1, '현재'), textElement('span', '→', 'smithy-comparison-arrow'), this.gradeCard(id, 2, '강화 후'));
            preview.append(comparison);
        }
        else {
            preview.append(this.gradeCard(id, offer.grade ?? 1, offer.targetGrade === null ? '보유 장비' : '제작 결과'));
        }
        if (offer.cost) {
            const materials = document.createElement('div');
            materials.className = 'smithy-materials';
            materials.append(textElement('small', '필요 재료 · 보유 / 필요'));
            for (const material of ['wood', 'stone']) {
                const owned = state.materials[material];
                const required = offer.cost[material];
                const row = document.createElement('p');
                row.dataset.shortage = String(owned < required);
                row.append(textElement('span', material === 'wood' ? '목재' : '돌'), textElement('span', `${owned} / ${required}${owned < required ? ' · 부족' : ''}`));
                materials.append(row);
            }
            preview.append(materials);
        }
        else {
            preview.append(textElement('p', work === 'craft' ? '제작 완료' : '강화 완료', 'smithy-complete'));
        }
        if (this.feedback?.id === id && this.feedback.work === work)
            preview.append(textElement('p', this.feedback.text, 'equipment-action-note'));
    }
    gradeCard(id, grade, label) {
        const card = document.createElement('div');
        card.className = 'smithy-grade-card';
        card.append(textElement('small', label), textElement('strong', equipmentGradeLabel(grade)), textElement('p', equipmentDefinitions[id].descriptions[grade]));
        return card;
    }
    submit(id, work, options) {
        if (this.submitting ||
            !smithyOffer(id, work, this.context.getState()).canExecute)
            return;
        this.submitting = true;
        try {
            // 선택한 작업을 유지한다. 보유 등급에 따라 제작을 강화로 바꾸지 않는다.
            const result = work === 'craft' ? this.context.onCraft(id) : this.context.onRefine(id);
            this.feedback = { id, work, text: result.message };
            this.options.onChanged?.(result);
        }
        catch (error) {
            this.feedback = {
                id,
                work,
                text: error instanceof Error
                    ? error.message
                    : '장비 요청을 완료하지 못했어요.',
            };
        }
        finally {
            this.submitting = false;
        }
        this.show(work, options);
    }
}
