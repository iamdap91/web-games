import { resourceUrl } from './resource-url.js';
import { embeddedScene } from './embedded-scene.js';
import { findLibraryEntry, libraryCategories, libraryEntries, } from './library-data.js';
import { createText } from './resource-card.js';
const main = document.querySelector('main');
if (main && !embeddedScene) {
    const current = new URL(location.href);
    const requested = current.searchParams.get('library-asset') ??
        current.searchParams.get('asset');
    const entry = findLibraryEntry(requested) ??
        libraryEntries.find((item) => {
            return [item.previewPath, item.comparisonPath].some((path) => {
                if (!path)
                    return false;
                const preview = resourceUrl(path);
                return (preview.pathname === current.pathname &&
                    [...preview.searchParams].every(([key, value]) => current.searchParams.get(key) === value));
            });
        });
    const navigation = document.createElement('nav');
    navigation.className = 'resource-navigation';
    navigation.setAttribute('aria-label', '라이브러리와 상세 목차');
    const home = createText('a', '← 리소스 라이브러리');
    const library = resourceUrl('src/resources/');
    if (entry)
        library.searchParams.set('project', current.searchParams.get('project') ?? entry.project);
    for (const key of ['category', 'group', 'q']) {
        const value = current.searchParams.get(key);
        if (value)
            library.searchParams.set(key, value);
    }
    home.href = `${library.pathname}${library.search}`;
    navigation.append(home);
    if (entry) {
        const category = createText('a', libraryCategories.find((item) => item.id === entry.category).name);
        const categoryUrl = new URL(library);
        categoryUrl.searchParams.set('category', entry.category);
        categoryUrl.searchParams.delete('group');
        categoryUrl.searchParams.delete('q');
        category.href = `${categoryUrl.pathname}${categoryUrl.search}`;
        navigation.append(category);
    }
    const contents = document.createElement('details');
    contents.hidden = true;
    contents.append(createText('summary', '화면 목차'));
    const links = document.createElement('div');
    contents.append(links);
    navigation.append(contents);
    main.before(navigation);
    const resize = new ResizeObserver(() => {
        document.documentElement.style.setProperty('--resource-navigation-height', `${navigation.getBoundingClientRect().height}px`);
    });
    resize.observe(navigation);
    const observer = new MutationObserver(refreshContents);
    let contentSignature = '';
    let sectionIndex = 0;
    observer.observe(main, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['hidden'],
    });
    refreshContents();
    window.addEventListener('pagehide', (event) => {
        if (!event.persisted) {
            observer.disconnect();
            resize.disconnect();
        }
    });
    function refreshContents() {
        if (!main)
            return;
        const headings = [
            ...main.querySelectorAll('h2, details > summary'),
        ].filter((heading) => !heading.closest('[hidden]'));
        const signature = headings
            .map((heading) => heading.textContent?.trim())
            .join('\n');
        if (signature === contentSignature)
            return;
        contentSignature = signature;
        links.replaceChildren(...headings.map((heading) => {
            const target = heading.tagName === 'SUMMARY' ? heading.parentElement : heading;
            if (!target.id)
                target.id = `resource-section-${sectionIndex++}`;
            const link = createText('a', heading.textContent?.trim() ?? '상세 항목');
            link.href = `#${target.id}`;
            return link;
        }));
        contents.hidden = headings.length === 0;
    }
}
