import { FinisherPresetRepository, finisherPresetSummary, parseFinisherPresetDocument, } from './finisher-presets.js';
function requiredElement(root, selector) {
    const result = root.querySelector(selector);
    if (!result)
        throw new Error(`필살기 저장 요소가 없습니다: ${selector}`);
    return result;
}
function presetId() {
    // LAN의 HTTP 주소에서도 사용할 수 있도록 secure context 전용 API를 피한다.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
/** 공유 목록과 가져온 파일의 상태, 입력 이벤트와 다운로드 URL을 소유한다. */
export class FinisherPresetControls {
    root;
    capture;
    onLoad;
    motionTitle;
    events = new AbortController();
    repository = new FinisherPresetRepository(this.events.signal);
    nameInput;
    fileInput;
    count;
    storage;
    selectionHint;
    feedback;
    empty;
    list;
    importedRoot;
    importedTitle;
    importedList;
    selection = {
        canSave: false,
        loading: true,
        motionId: '',
    };
    ready = false;
    busy = false;
    selectedId;
    deleteId;
    imported;
    downloadUrl;
    constructor(settings) {
        this.root = settings.root;
        this.capture = settings.capture;
        this.onLoad = settings.onLoad;
        this.motionTitle = settings.motionTitle;
        this.nameInput = requiredElement(this.root, '#finisher-preset-name');
        this.fileInput = requiredElement(this.root, '#finisher-preset-file');
        this.count = requiredElement(this.root, '#finisher-preset-count');
        this.storage = requiredElement(this.root, '#finisher-preset-storage');
        this.selectionHint = requiredElement(this.root, '#finisher-preset-selection');
        this.feedback = requiredElement(this.root, '#finisher-preset-status');
        this.empty = requiredElement(this.root, '#finisher-preset-empty');
        this.list = requiredElement(this.root, '#finisher-preset-list');
        this.importedRoot = requiredElement(this.root, '#finisher-preset-imported');
        this.importedTitle = requiredElement(this.root, '#finisher-preset-imported-title');
        this.importedList = requiredElement(this.root, '#finisher-preset-imported-list');
        this.root.addEventListener('click', (event) => this.handleClick(event), {
            signal: this.events.signal,
        });
        this.nameInput.addEventListener('input', () => this.renderControls(), {
            signal: this.events.signal,
        });
        this.fileInput.addEventListener('change', () => this.importFile(), {
            signal: this.events.signal,
        });
        this.renderControls();
    }
    async start() {
        await this.refresh();
    }
    updateSelection(selection) {
        this.selection = selection;
        const selected = this.repository.document.presets.find((preset) => preset.id === this.selectedId);
        if (selected &&
            !selection.loading &&
            selected.motionId !== selection.motionId) {
            this.selectedId = undefined;
            this.deleteId = undefined;
            this.renderList();
        }
        this.renderControls();
    }
    dispose() {
        this.events.abort();
        if (this.downloadUrl)
            URL.revokeObjectURL(this.downloadUrl);
    }
    handleClick(event) {
        const target = event.target;
        if (!(target instanceof Element))
            return;
        const button = target.closest('button[data-preset-action]');
        if (!button || !this.root.contains(button) || button.disabled)
            return;
        const id = button.dataset.presetId;
        switch (button.dataset.presetAction) {
            case 'refresh':
                void this.refresh();
                return;
            case 'save':
                void this.saveCurrent(false);
                return;
            case 'update':
                void this.saveCurrent(true);
                return;
            case 'load': {
                const preset = this.repository.document.presets.find((item) => item.id === id);
                if (preset)
                    void this.loadPreset(preset, 'saved');
                return;
            }
            case 'delete':
                this.deleteId = id;
                this.renderList();
                return;
            case 'delete-cancel':
                this.deleteId = undefined;
                this.renderList();
                return;
            case 'delete-confirm':
                if (id && id === this.deleteId)
                    void this.deletePreset(id);
                return;
            case 'export':
                this.exportFile();
                return;
            case 'import':
                this.fileInput.click();
                return;
            case 'import-load': {
                const preset = this.imported?.presets.find((item) => item.id === id);
                if (preset)
                    void this.loadPreset(preset, 'imported');
                return;
            }
            case 'import-save':
                void this.saveImported();
                return;
            case 'import-dismiss':
                this.imported = undefined;
                this.renderImported();
                this.renderControls();
        }
    }
    async perform(operation) {
        if (this.busy || this.events.signal.aborted)
            return;
        this.busy = true;
        this.renderControls();
        try {
            await operation();
        }
        catch (error) {
            if (!this.events.signal.aborted)
                this.showFeedback(error instanceof Error ? error.message : '설정을 처리하지 못했어요.', 'error');
        }
        finally {
            this.busy = false;
            if (!this.events.signal.aborted)
                this.renderControls();
        }
    }
    async refresh() {
        await this.perform(async () => {
            this.showFeedback('공유 저장 목록을 불러오는 중이에요.');
            await this.repository.load();
            if (this.events.signal.aborted)
                return;
            this.ready = true;
            if (!this.repository.document.presets.some((preset) => preset.id === this.selectedId))
                this.selectedId = undefined;
            this.deleteId = undefined;
            this.renderList();
            this.showFeedback('저장 목록을 불러왔어요.');
        });
        if (!this.ready) {
            this.storage.textContent =
                '공유 저장 목록을 읽지 못했어요. 목록 새로고침으로 다시 연결할 수 있어요.';
            this.count.textContent = '—';
        }
    }
    async saveCurrent(update) {
        if (!this.canWrite() || !this.selection.canSave)
            return;
        const name = this.nameInput.value.trim();
        if (!name) {
            this.showFeedback('저장할 설정의 이름을 입력해 주세요.', 'error');
            this.nameInput.focus();
            return;
        }
        const existing = this.repository.document.presets.find((preset) => preset.id === this.selectedId);
        if (update && (!existing || existing.motionId !== this.selection.motionId))
            return;
        await this.perform(async () => {
            const preset = {
                ...this.capture(name),
                id: update ? existing.id : presetId(),
                updatedAt: new Date().toISOString(),
            };
            const presets = update
                ? this.repository.document.presets.map((item) => item.id === preset.id ? preset : item)
                : [...this.repository.document.presets, preset];
            await this.repository.put(presets);
            if (this.events.signal.aborted)
                return;
            this.selectedId =
                this.selection.motionId === preset.motionId ? preset.id : undefined;
            this.deleteId = undefined;
            this.renderList();
            this.showFeedback(`‘${name}’ 설정을 ${update ? '갱신했어요' : '저장했어요'}. 다른 PC에서도 목록을 새로고침하면 볼 수 있어요.`);
        });
    }
    async loadPreset(preset, source) {
        await this.perform(async () => {
            const loaded = await this.onLoad(preset);
            if (this.events.signal.aborted)
                return;
            if (!loaded) {
                this.showFeedback('설정을 불러오지 못했어요. 지원하는 필살기와 연출인지 확인해 주세요.', 'error');
                return;
            }
            this.selectedId = source === 'saved' ? preset.id : undefined;
            this.deleteId = undefined;
            this.nameInput.value = preset.name;
            this.renderList();
            this.showFeedback(`‘${preset.name}’ 설정을 불러왔어요.${source === 'imported' ? ' 공유 목록에 저장하려면 새로 저장 또는 가져온 설정 저장을 누르세요.' : ''}`);
        });
    }
    async deletePreset(id) {
        if (!this.canWrite())
            return;
        const preset = this.repository.document.presets.find((item) => item.id === id);
        if (!preset)
            return;
        await this.perform(async () => {
            await this.repository.put(this.repository.document.presets.filter((item) => item.id !== id));
            if (this.events.signal.aborted)
                return;
            if (this.selectedId === id)
                this.selectedId = undefined;
            this.deleteId = undefined;
            this.renderList();
            this.showFeedback(`‘${preset.name}’ 설정을 삭제했어요.`);
        });
    }
    importFile() {
        const file = this.fileInput.files?.[0];
        this.fileInput.value = '';
        if (!file)
            return;
        void this.perform(async () => {
            if (file.size > 1_000_000)
                throw new Error('설정 JSON 파일은 1MB 이하로 가져올 수 있어요.');
            let value;
            try {
                value = JSON.parse(await file.text());
            }
            catch {
                throw new Error('올바른 JSON 설정 파일인지 확인해 주세요.');
            }
            const imported = parseFinisherPresetDocument(value);
            if (this.events.signal.aborted)
                return;
            this.imported = imported;
            this.renderImported();
            this.showFeedback(`‘${file.name}’에서 ${imported.presets.length}개를 가져왔어요. 아직 공유 목록에는 저장하지 않았어요.`);
        });
    }
    async saveImported() {
        if (!this.canWrite() || !this.imported?.presets.length)
            return;
        const imported = this.imported;
        await this.perform(async () => {
            // 파일의 식별자를 재사용하지 않아 기존 설정을 가져온 파일로 덮어쓰지 않는다.
            const presets = imported.presets.map((preset) => ({
                ...preset,
                id: presetId(),
                updatedAt: new Date().toISOString(),
            }));
            await this.repository.put([
                ...this.repository.document.presets,
                ...presets,
            ]);
            if (this.events.signal.aborted)
                return;
            this.imported = undefined;
            this.renderImported();
            this.renderList();
            this.showFeedback(`가져온 설정 ${presets.length}개를 공유 목록에 새로 저장했어요.`);
        });
    }
    exportFile() {
        if (!this.ready || !this.repository.document.presets.length)
            return;
        if (this.downloadUrl)
            URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(new Blob([JSON.stringify(this.repository.document, null, 2) + '\n'], {
            type: 'application/json',
        }));
        const link = this.root.ownerDocument.createElement('a');
        link.href = this.downloadUrl;
        link.download = `ataho-v2-finisher-presets-${new Date().toISOString().slice(0, 10)}.json`;
        this.root.append(link);
        link.click();
        link.remove();
        this.showFeedback(`저장 설정 ${this.repository.document.presets.length}개를 JSON 파일로 내보냈어요.`);
    }
    canWrite() {
        return this.ready && this.repository.writable && !this.busy;
    }
    renderControls() {
        const canWrite = this.canWrite();
        const canCapture = canWrite && this.selection.canSave && !this.selection.loading;
        this.nameInput.disabled = !canCapture;
        const selected = this.repository.document.presets.find((preset) => preset.id === this.selectedId);
        for (const button of this.root.querySelectorAll('button[data-preset-action]')) {
            const action = button.dataset.presetAction;
            if (button.hasAttribute('data-preset-write'))
                button.disabled = !canWrite;
            else
                button.disabled = this.busy;
            if (action === 'save')
                button.disabled = !canCapture || !this.nameInput.value.trim();
            if (action === 'update')
                button.disabled =
                    !canCapture ||
                        !selected ||
                        selected.motionId !== this.selection.motionId ||
                        !this.nameInput.value.trim();
            if (action === 'load' || action === 'import-load')
                button.disabled = this.busy || this.selection.loading;
            if (action === 'export')
                button.disabled =
                    this.busy || !this.ready || !this.repository.document.presets.length;
            if (action === 'import-save')
                button.disabled = !canWrite || !this.imported?.presets.length;
        }
        if (this.ready) {
            this.count.textContent = String(this.repository.document.presets.length);
            this.storage.textContent = this.repository.writable
                ? '이 PC의 공유 파일에 저장해요. 다른 PC에서도 같은 조합실 주소로 열면 이 목록을 사용할 수 있어요.'
                : '이 페이지는 읽기 전용이에요. 저장·갱신·삭제는 이 PC에서 실행 중인 조합실 주소에서 할 수 있어요. JSON은 가져와서 불러볼 수 있어요.';
        }
        this.selectionHint.textContent = selected
            ? `갱신 대상: ${this.motionTitle(selected.motionId)} · ${selected.name}. 새로 저장을 누르면 별도 설정으로 보관해요.`
            : this.selection.loading
                ? '동작을 불러오는 중이에요.'
                : this.selection.canSave
                    ? '현재 필살기의 연출·박자를 저장해요. 화면 크기·샌드백·재생 설정은 미리보기 값으로 구분해 함께 보관해요.'
                    : '필살기를 선택하면 현재 설정을 이름 붙여 저장할 수 있어요.';
        this.root.setAttribute('aria-busy', String(this.busy));
    }
    renderList() {
        const presets = [...this.repository.document.presets].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        this.list.replaceChildren(...presets.map((preset) => this.presetRow(preset, 'saved')));
        this.empty.hidden = !this.ready || presets.length > 0;
        this.empty.textContent = this.repository.writable
            ? '아직 저장한 설정이 없어요. 필살기를 조절한 뒤 이름을 붙여 새로 저장하세요.'
            : '배포된 저장 목록이 아직 비어 있어요.';
        this.renderControls();
    }
    renderImported() {
        this.importedRoot.hidden = !this.imported;
        this.importedTitle.textContent = `가져온 설정 ${this.imported?.presets.length ?? 0}개`;
        this.importedList.replaceChildren(...(this.imported?.presets ?? []).map((preset) => this.presetRow(preset, 'imported')));
        if (this.imported)
            this.importedRoot.open = true;
        this.renderControls();
    }
    presetRow(preset, source) {
        const document = this.root.ownerDocument;
        const row = document.createElement('li');
        row.className = 'preset-item';
        if (source === 'saved' && preset.id === this.selectedId)
            row.setAttribute('aria-current', 'true');
        const heading = document.createElement('div');
        heading.className = 'preset-item-heading';
        const title = document.createElement('h3');
        title.textContent = preset.name;
        const motion = document.createElement('span');
        motion.className = 'preset-motion-name';
        motion.textContent = this.motionTitle(preset.motionId);
        const time = document.createElement('time');
        time.dateTime = preset.updatedAt;
        time.textContent = new Intl.DateTimeFormat('ko-KR', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(preset.updatedAt));
        heading.append(title, motion, time);
        const summary = document.createElement('p');
        summary.className = 'preset-item-summary';
        summary.textContent = finisherPresetSummary(preset);
        const actions = document.createElement('div');
        actions.className = 'preset-item-actions';
        actions.append(this.actionButton(preset, source === 'saved' ? 'load' : 'import-load', source === 'saved' ? '불러오기' : '불러보기'));
        if (source === 'saved') {
            if (this.deleteId === preset.id) {
                const question = document.createElement('span');
                question.className = 'preset-delete-question';
                question.textContent = '이 설정을 삭제할까요?';
                actions.append(question, this.actionButton(preset, 'delete-confirm', '삭제 확인'), this.actionButton(preset, 'delete-cancel', '취소'));
            }
            else
                actions.append(this.actionButton(preset, 'delete', '삭제'));
        }
        row.append(heading, summary, actions);
        return row;
    }
    actionButton(preset, action, label) {
        const button = this.root.ownerDocument.createElement('button');
        button.type = 'button';
        button.dataset.presetAction = action;
        button.dataset.presetId = preset.id;
        button.textContent = label;
        button.setAttribute('aria-label', `${preset.name} ${label}`);
        if (action === 'delete' || action === 'delete-confirm')
            button.setAttribute('data-preset-write', '');
        return button;
    }
    showFeedback(message, level = 'info') {
        this.feedback.hidden = false;
        this.feedback.textContent = message;
        this.feedback.dataset.level = level;
    }
}
