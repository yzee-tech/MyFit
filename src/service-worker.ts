/// <reference lib="WebWorker" />
import { PrecacheFallbackPlugin, cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly } from 'workbox-strategies';
declare let self: ServiceWorkerGlobalScope;

const cacheFirstDestinations: RequestDestination[] = ['style', 'manifest', 'image', 'font'];
const prerenderedPages = ['/privacy-policy', '/terms-of-service', '/offline', '/docs'];
const fallbackPlugin = new PrecacheFallbackPlugin({ fallbackURL: '/offline' });

function routingStrategyFunction(mode: 'networkOnly' | 'cacheFirst', request: Request, url: URL) {
	// Ignore /auth requests
	if (url.pathname.startsWith('/auth')) return false;

	// Let the browser handle data exports itself: NetworkOnly's 5 s timeout would otherwise answer a slow
	// export (or an offline one) with the /offline page, saved under the export's file name
	if (url.pathname.startsWith('/settings/export')) return false;

	// Decide whether or not asset should be cached (cacheFirstDestinations, and unplugin-icons)
	const toCache =
		cacheFirstDestinations.includes(request.destination) ||
		prerenderedPages.includes(url.pathname) ||
		url.pathname.includes('~icons');

	// If function used in cacheFirst strategy, return toCache value
	// otherwise being used in networkOnly, which is naturally the assets which shouldn't be cached
	return mode === 'cacheFirst' ? toCache : !toCache;
}

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST, { ignoreURLParametersMatching: [/callbackURL/] });

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

registerRoute(
	({ request, url }) => routingStrategyFunction('networkOnly', request, url),
	new NetworkOnly({ plugins: [fallbackPlugin], networkTimeoutSeconds: 5 })
);

registerRoute(
	({ request, url }) => routingStrategyFunction('cacheFirst', request, url),
	new CacheFirst({ plugins: [fallbackPlugin] })
);
