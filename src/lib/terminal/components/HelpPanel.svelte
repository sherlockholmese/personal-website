<script lang="ts">
	import { InlineCode, KeyValueList, KeyValueRow, Panel, PanelSection } from '#lib/ui/index.ts';
	import { commandCatalog } from '../help';

	const groupLabels = {
		start: 'Start',
		blog: 'Blog',
		filesystem: 'Filesystem',
		display: 'Display'
	};

	const groups = Object.entries(groupLabels).map(([key, label]) => ({
		key,
		label,
		commands: commandCatalog.filter((entry) => entry.group === key)
	}));
</script>

<Panel title="help" meta={`${commandCatalog.length} commands`}>
	{#each groups as group (group.key)}
		<PanelSection label={group.label}>
			<KeyValueList class="help-commands" labelWidth="minmax(190px, 0.42fr)" muted>
				{#each group.commands as entry (entry.command)}
					<KeyValueRow>
						{#snippet term()}<InlineCode>{entry.command}</InlineCode>{/snippet}
						{entry.description}
					</KeyValueRow>
				{/each}
			</KeyValueList>
		</PanelSection>
	{/each}
</Panel>

<style>
	:global(.ui-kv.help-commands) {
		margin-bottom: 0;
	}
</style>
