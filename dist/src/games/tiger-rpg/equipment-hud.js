import { equipmentSlots } from './equipment.js';
import { equipmentIconUrl, equipmentItemLabel, equipmentSlotLabel, } from './equipment-presentation.js';
/** 표시만 소유한다. 정지·포커스·입력 소모는 기존 메뉴를 여는 화면에 맡긴다. */
export class EquipmentHud {
    button = document.createElement('button');
    stylesheet = document.createElement('link');
    lifetime = new AbortController();
    constructor(root, options) {
        this.stylesheet.rel = 'stylesheet';
        this.stylesheet.href = new URL('../../../../src/games/tiger-rpg/equipment-hud.css', import.meta.url).href;
        this.button.type = 'button';
        this.button.className = 'equipment-hud';
        this.button.addEventListener('click', options.onOpen, {
            signal: this.lifetime.signal,
        });
        root.append(this.stylesheet, this.button);
        this.update(options.loadout);
    }
    update(loadout) {
        const labels = [];
        this.button.replaceChildren();
        for (const slot of equipmentSlots) {
            const item = loadout[slot];
            const cell = document.createElement('span');
            cell.className = 'equipment-hud-slot';
            cell.dataset.slot = slot;
            cell.dataset.empty = String(item === null);
            cell.setAttribute('aria-hidden', 'true');
            const stars = document.createElement('span');
            stars.className = 'equipment-hud-stars';
            if (item) {
                const icon = document.createElement('img');
                icon.src = equipmentIconUrl(item.id);
                icon.alt = '';
                icon.width = 28;
                icon.height = 28;
                cell.append(icon);
                stars.textContent = item.grade === 2 ? '★★' : '★';
            }
            else {
                const empty = document.createElement('span');
                empty.className = 'equipment-hud-empty';
                empty.textContent = equipmentSlotLabel(slot);
                cell.append(empty);
                stars.textContent = '—';
            }
            const label = `${equipmentSlotLabel(slot)}: ${item ? equipmentItemLabel(item) : '빈 슬롯'}`;
            cell.title = label;
            labels.push(label);
            cell.append(stars);
            this.button.append(cell);
        }
        this.button.setAttribute('aria-label', `장비 상세 · ${labels.join(' · ')}`);
        this.button.title = '장비 상세';
    }
    setVisible(visible) {
        this.button.hidden = !visible;
        this.button.disabled = !visible;
    }
    dispose() {
        this.lifetime.abort();
        this.button.remove();
        this.stylesheet.remove();
    }
}
