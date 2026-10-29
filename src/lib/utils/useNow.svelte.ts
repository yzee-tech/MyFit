/**
 * "Now" for a week shown on a page: null on the server and in the first render (the server's clock
 * and timezone are not the phone's, so a week from them would flash and mismatch), then the moment
 * the page was opened, and a new one every time the page comes back to the front (an app left open
 * overnight shows the new day). No timer. Call it while a component is being set up
 */
export function useNow() {
	let now: Date | null = $state(null);
	$effect(() => {
		const refresh = () => (now = new Date());
		refresh();
		document.addEventListener('visibilitychange', refresh);
		window.addEventListener('pageshow', refresh);
		return () => {
			document.removeEventListener('visibilitychange', refresh);
			window.removeEventListener('pageshow', refresh);
		};
	});
	return {
		get value() {
			return now;
		}
	};
}
