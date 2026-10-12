import { resourceUrl } from '../catalog/resource-url.js';
import { startLibrary } from '../catalog/library-page.js';
const url = new URL(location.href);
url.pathname = resourceUrl('src/resources/').pathname;
history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
startLibrary();
