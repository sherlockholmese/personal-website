<script lang="ts">
	let {
		cwd,
		input = $bindable(''),
		inputRef = $bindable<HTMLInputElement | undefined>(),
		onKeydown,
		onSubmit,
		onAutocomplete,
		onDismissKeyboard
	}: {
		cwd: string;
		input?: string;
		inputRef?: HTMLInputElement;
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

<form
	class="flex flex-col border-0 bg-[var(--bg)] p-0 text-[15px] max-[760px]:text-[16px]"
	onsubmit={(event) => (event.preventDefault(), onSubmit())}
>
	<div class="leading-[1.45] text-[var(--tx)]">
		<span
			class="text-[var(--cyan)] max-[760px]:text-[0px] max-[760px]:after:text-[16px] max-[760px]:after:content-['~']"
		>
			{cwd}
		</span>
	</div>
	<div class="m-0 flex items-center gap-2 leading-[1.45] max-[760px]:min-h-[44px]">
		<span class="text-[var(--yellow)]">❯</span>
		<input
			bind:this={inputRef}
			bind:value={input}
			aria-label="terminal command"
			aria-keyshortcuts="Tab"
			autocomplete="off"
			autocapitalize="none"
			autocorrect="off"
			enterkeyhint="go"
			spellcheck={false}
			onkeydown={onKeydown}
			class="min-w-[40px] flex-1 appearance-none border-0 bg-transparent p-0 leading-[1.45] text-[var(--tx)] caret-[var(--yellow)] outline-none max-[760px]:text-[16px]"
		/>
		{#if input}
			<button
				type="button"
				class="terminal-autocomplete-button"
				aria-label="autocomplete command"
				onpointerdown={preserveInputFocus}
				onclick={onAutocomplete}
			>
				tab
			</button>
		{/if}
		<button
			type="button"
			class="terminal-keyboard-dismiss"
			aria-label="hide keyboard"
			onclick={onDismissKeyboard}
		>
			hide
		</button>
	</div>
</form>
