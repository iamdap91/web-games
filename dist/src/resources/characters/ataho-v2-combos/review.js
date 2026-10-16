/** 자료 분류와 펼침 상태를 소유하며 열린 GIF만 표시하고 주소를 연결한다. */
class ReviewLibrary {
    controller = new AbortController();
    categories;
    groups;
    images;
    navigation;
    status;
    constructor(root) {
        this.categories = [
            ...root.querySelectorAll('[data-review-category]'),
        ];
        this.groups = [
            ...root.querySelectorAll('details[data-review-scope]'),
        ];
        this.images = [...root.querySelectorAll('img[data-src]')];
        this.navigation = [
            ...root.querySelectorAll('[data-review-link]'),
        ];
        this.status = root.querySelector('#review-status');
        const signal = this.controller.signal;
        root.addEventListener('toggle', this.handleToggle, {
            capture: true,
            signal,
        });
        root.addEventListener('click', this.handleLink, { signal });
        root.addEventListener('load', this.handleImageLoad, {
            capture: true,
            signal,
        });
        root.addEventListener('error', this.handleImageError, {
            capture: true,
            signal,
        });
        window.addEventListener('hashchange', this.revealHash, { signal });
        window.addEventListener('pagehide', this.handlePageHide, { signal });
        this.revealHash();
    }
    activate(category) {
        if (!category)
            return;
        for (const item of this.categories)
            item.hidden = item !== category;
        for (const link of this.navigation) {
            if (link.dataset.reviewLink === category.id)
                link.setAttribute('aria-current', 'location');
            else
                link.removeAttribute('aria-current');
        }
        if (this.status)
            this.status.textContent = `${category.dataset.reviewCategory ?? '자료'} · 열린 묶음만 GIF를 불러옵니다.`;
        this.syncImages();
    }
    isVisible(image) {
        const category = image.closest('[data-review-category]');
        if (!category || category.hidden)
            return false;
        let ancestor = image.parentElement;
        while (ancestor && ancestor !== category) {
            if (ancestor instanceof HTMLDetailsElement && !ancestor.open)
                return false;
            ancestor = ancestor.parentElement;
        }
        return true;
    }
    placeholder(image) {
        return (image.parentElement?.querySelector('[data-gif-placeholder]') ?? null);
    }
    syncImages() {
        for (const image of this.images) {
            const placeholder = this.placeholder(image);
            if (!this.isVisible(image)) {
                // 닫힌 GIF의 주소를 지워 불필요한 표시·요청을 줄인다.
                image.removeAttribute('src');
                image.hidden = true;
                if (placeholder)
                    placeholder.hidden = false;
                continue;
            }
            if (!image.hasAttribute('src')) {
                const source = image.dataset.src;
                if (!source)
                    continue;
                // 보이는 레이아웃 안에 있어야 브라우저의 lazy 로딩도 시작한다.
                image.hidden = false;
                image.src = source;
            }
            else {
                image.hidden = image.complete && image.naturalWidth === 0;
                if (image.complete && image.naturalWidth > 0 && placeholder)
                    placeholder.hidden = true;
            }
        }
    }
    reveal(target) {
        const category = target.closest('[data-review-category]');
        if (!category)
            return;
        // 이전 #smear-attacks 링크도 분류와 접힌 묶음을 먼저 열고 이동한다.
        let ancestor = target;
        while (ancestor && ancestor !== category) {
            if (ancestor instanceof HTMLDetailsElement) {
                for (const other of this.groups)
                    if (other !== ancestor &&
                        other.dataset.reviewScope === ancestor.dataset.reviewScope)
                        other.open = false;
                ancestor.open = true;
            }
            ancestor = ancestor.parentElement;
        }
        this.activate(category);
        target.scrollIntoView({ block: 'start' });
    }
    revealHash = () => {
        const fragment = window.location.hash.slice(1);
        if (!fragment) {
            this.activate(this.categories[0]);
            return;
        }
        let id = fragment;
        try {
            id = decodeURIComponent(fragment);
        }
        catch {
            // 잘못 인코딩된 주소여도 기본 자료 분류는 유지한다.
        }
        const target = document.getElementById(id);
        if (target?.closest('[data-review-category]'))
            this.reveal(target);
        else
            this.activate(this.categories[0]);
    };
    handleLink = (event) => {
        if (event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey)
            return;
        if (!(event.target instanceof Element))
            return;
        const link = event.target.closest('a[href^="#"]');
        const target = link && document.getElementById(link.hash.slice(1));
        if (target)
            this.reveal(target);
    };
    handleToggle = (event) => {
        const group = event.target;
        if (!(group instanceof HTMLDetailsElement))
            return;
        if (group.open) {
            for (const other of this.groups)
                if (other !== group &&
                    other.dataset.reviewScope === group.dataset.reviewScope)
                    other.open = false;
        }
        this.syncImages();
    };
    handleImageLoad = (event) => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement) ||
            !image.dataset.src ||
            !this.isVisible(image))
            return;
        image.hidden = false;
        const placeholder = this.placeholder(image);
        if (placeholder)
            placeholder.hidden = true;
    };
    handleImageError = (event) => {
        const image = event.target;
        if (!(image instanceof HTMLImageElement) || !image.dataset.src)
            return;
        image.hidden = true;
        const placeholder = this.placeholder(image);
        if (placeholder)
            placeholder.hidden = false;
    };
    handlePageHide = (event) => {
        if (!event.persisted)
            this.destroy();
    };
    destroy() {
        this.controller.abort();
        for (const image of this.images)
            image.removeAttribute('src');
    }
}
const library = document.querySelector('#review-library');
if (library)
    new ReviewLibrary(library);
export {};
