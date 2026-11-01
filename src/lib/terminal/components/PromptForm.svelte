<script lang="ts">
	import { Button, Prompt, TextField } from '#lib/ui/index.ts';

	let {
		cwd,
		input = $bindable(''),
		inputRef = $bindable<HTMLInputElement | undefined>(),
		keyboardOpen = false,
		completionListId,
		activeCompletionId,
		onInput,
		onBlur,
		onKeydown,
		onSubmit,
		onAutocomplete,
		onDismissKeyboard
	}: {
		cwd: string;
		input?: string;
		inputRef?: HTMLInputElement;
		keyboardOpen?: boolean;
		/** Set while a completion list is open. */
		completionListId?: string;
		activeCompletionId?: string;
		onInput: () => void;
		onBlur: () => void;
		onKeydown: (event: KeyboardEvent) => void;
		onSubmit: () => void;
		onAutocomplete: () => void;
		onDismissKeyboard: () => void;
	} = $props();

	function preserveInputFocus(event: PointerEvent) {
		if (event.pointerType !== 'mouse') {
			event.preventDefault();
		}
	}
</script>

<form onsubmit={(event) => (event.preventDefault(), onSubmit())}>
	<Prompt {cwd} collapse>
		<TextField
			bind:value={input}
			bind:ref={inputRef}
			variant="bare"
			label="terminal command"
			hideLabel
			aria-keyshortcuts="Tab"
			autocomplete="off"
			autocorrect="off"
			enterkeyhint="go"
			role={completionListId ? 'combobox' : undefined}
			aria-autocomplete={completionListId ? 'list' : undefined}
			aria-expanded={completionListId ? true : undefined}
			aria-controls={completionListId}
			aria-activedescendant={activeCompletionId}
			oninput={onInput}
			onblur={onBlur}
			onkeydown={onKeydown}
		>
			{#snippet actions()}
				<span class="prompt-actions">
					{#if input}
						<Button
							size="sm"
							aria-label="autocomplete command"
							onpointerdown={preserveInputFocus}
							onclick={onAutocomplete}
						>
							tab
						</Button>
					{/if}
					{#if keyboardOpen}
						<Button size="sm" aria-label="hide keyboard" onclick={onDismissKeyboard}>hide</Button>
					{/if}
				</span>
			{/snippet}
		</TextField>
	</Prompt>
</form>

<style>
	.prompt-actions {
		display: none;
	}

	@media (max-width: 760px) {
		.prompt-actions {
			display: inline-flex;
			flex: none;
			gap: var(--space-2);
		}
	}
</style>
