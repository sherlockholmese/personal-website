<script lang="ts">
	import { DataTable, Panel, type DataTableColumn } from '#lib/ui/index.ts';

	type Project = { name: string; description: string; url: string };

	const projects: Project[] = [
		{
			name: 'softmun-oss',
			description: 'Open-source Model UN committee management software.',
			url: 'https://github.com/sherlockholmestech/softmun-oss'
		},
		{
			name: 'vol3-symbol-manager',
			description: 'Fast CLI symbol manager for Volatility 3.',
			url: 'https://github.com/sherlockholmestech/vol3-symbol-manager'
		},
		{
			name: 'pwninit',
			description: 'Automates setup for pwn and reverse engineering challenges.',
			url: 'https://github.com/sherlockholmestech/pwninit'
		},
		{
			name: 'rclone-tray',
			description: 'Linux tray app for mounting rclone remotes as local folders.',
			url: 'https://github.com/sherlockholmese/rclone-tray'
		}
	];

	const columns: DataTableColumn<Project>[] = [
		{ key: 'name', label: 'name', width: '20%' },
		{ key: 'description', label: 'description', width: '36%' },
		{ key: 'url', label: 'url', width: '44%', tone: 'info' }
	];
</script>

<Panel title="projects" meta={`${projects.length} repos`}>
	<DataTable
		label="projects"
		{columns}
		rows={projects}
		rowKey={(project) => project.url}
		href={(project) => project.url}
		external
	/>
</Panel>
