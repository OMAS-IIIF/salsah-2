/** Static fixture data for the backend-independent workspace prototype. */
export const demoWorkspace = {
	tabs: [
		{ id: 'overview', label: 'Übersicht', closeable: false },
		{ id: 'letter', label: 'Burckhardt, Brief', closeable: true, color: 'copper' },
		{ id: 'photo', label: 'Münsterplatz', closeable: true, color: 'navy' }
	],
	recentResources: [
		{
			kind: 'letter',
			title: 'Brief von Jacob Burckhardt an Max Alioth',
			meta: '12. Juni 1889 · 6 Seiten',
			color: 'copper'
		},
		{
			kind: 'photograph',
			title: 'Ansicht des Basler Münsterplatzes',
			meta: 'Fotografie · um 1910',
			color: 'navy'
		},
		{
			kind: 'record',
			title: 'Protokoll der Historischen Gesellschaft',
			meta: 'Band 14 · 1923–1928',
			color: 'teal'
		}
	]
} as const;
