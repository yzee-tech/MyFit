<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { signIn } from '@auth/sveltekit/client';
	import GitHubIcon from 'virtual:icons/mdi/github';
	import GoogleIcon from 'virtual:icons/mdi/google';

	let { data } = $props();

	// The same key the header's login menu uses, so the last one used comes first there too
	const LAST_USED_PROVIDER_KEY = 'last-used-auth-provider';

	function continueWith(provider: 'google' | 'github') {
		try {
			localStorage.setItem(LAST_USED_PROVIDER_KEY, provider);
		} catch {
			// Storage unavailable: signing in still works
		}
		signIn(provider, { callbackUrl: data.redirectTo });
	}
</script>

<svelte:head>
	<title>Sign in · MyFit</title>
</svelte:head>

<div class="flex grow flex-col items-center justify-center gap-6 px-4 py-10 text-center">
	<img alt="" height={96} src="/logo.svg" width={96} />
	<div class="flex flex-col gap-2">
		<h1 class="text-3xl font-bold">MyFit</h1>
		<p class="max-w-xs text-muted-foreground">Plan your routines, log your workouts, and get your next numbers.</p>
	</div>
	<div class="flex w-full max-w-xs flex-col gap-2">
		<Button class="gap-2" onclick={() => continueWith('google')} size="lg">
			<GoogleIcon class="h-5 w-5" /> Continue with Google
		</Button>
		<Button class="gap-2" onclick={() => continueWith('github')} size="lg" variant="outline">
			<GitHubIcon class="h-5 w-5" /> Continue with GitHub
		</Button>
	</div>
	<p class="flex gap-3 text-sm text-muted-foreground">
		<a class="hover:underline" href="/docs">Docs</a>·
		<a class="hover:underline" href="/privacy-policy">Privacy</a>·
		<a class="hover:underline" href="/terms-of-service">Terms</a>
	</p>
</div>
