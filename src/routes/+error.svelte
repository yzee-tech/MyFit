<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';

	// Plain words for what went wrong; signed out gets a way to sign in, and back
	let notSignedIn = $derived($page.status === 401);
	let title = $derived.by(() => {
		if (notSignedIn) return 'Sign in to continue';
		if ($page.status === 404) return "This page doesn't exist";
		if ($page.status === 403) return "You don't have access to this";
		if ($page.status >= 500) return 'Something went wrong';
		return 'Something went wrong';
	});
	let detail = $derived.by(() => {
		if (notSignedIn) return 'Your session has ended, or you haven’t signed in yet.';
		if ($page.status === 404) return 'It may have moved, or the link is wrong.';
		if ($page.status >= 500) return 'Please try again in a moment.';
		return $page.error?.message ?? '';
	});
	let signInLink = $derived(`/login?redirectTo=${encodeURIComponent($page.url.pathname + $page.url.search)}`);
</script>

<div class="flex w-full grow flex-col items-center justify-center gap-3 px-4 text-center" data-testid="error-page">
	<img alt="" height={64} src="/logo.svg" width={64} />
	<h1 class="text-2xl font-bold">{title}</h1>
	{#if detail}
		<p class="max-w-sm text-muted-foreground">{detail}</p>
	{/if}
	<div class="mt-2 flex gap-2">
		{#if notSignedIn}
			<Button href={signInLink}>Sign in</Button>
		{:else}
			<Button href="/">Go home</Button>
		{/if}
	</div>
</div>
