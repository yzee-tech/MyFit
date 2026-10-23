<script lang="ts">
	import H2 from '$lib/components/ui/typography/H2.svelte';
	import DOMPurify from 'dompurify';
	import { marked } from 'marked';
	import changelog from '../../../CHANGELOG.md?raw';

	// The notes ship with the app (no GitHub call); the file's own "# Changelog" title is this page's H2
	const notes = changelog.replace(/^# Changelog\s*\n/, '');
</script>

<svelte:head>
	<title>Changelog - MyFit</title>
	<meta name="description" content="See what's new in MyFit with regular updates and feature improvements." />
</svelte:head>

<H2>Changelog</H2>
<article class="prose prose-sm dark:prose-invert md:prose-base">
	{#await marked.parse(notes) then html}
		{@html DOMPurify.sanitize(html)}
	{/await}
</article>
