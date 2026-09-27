<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { authSession } from '$lib/auth/session';
	import { loadZipImportJob, type ZipImportJob } from '$lib/staging/zipImport';
	import StagingZipUpload from '$lib/components/admin/StagingZipUpload.svelte';
	import { m } from '$lib/paraglide/messages';
	let job = $state<ZipImportJob | null>(null);
	let error = $state('');
	// Load with owner authorization, then reuse the existing version-bound import review.
	$effect(() => {
		const id = page.params.importId;
		if ($authSession.status !== 'authenticated' || !id) return;
		let active = true;
		job = null;
		error = '';
		void loadZipImportJob(id)
			.then((value) => {
				if (active) job = value;
			})
			.catch((e) => {
				if (active) error = String(e);
			});
		return () => {
			active = false;
		};
	});
</script>

<svelte:head><title>ZIP Import · SALSAH</title></svelte:head>
{#if error}<p role="alert">{error}</p>{:else if job}
	{#key job.importId}<StagingZipUpload
			project={job.target.projectShortName}
			areaIri={job.target.stagingAreaIri}
			folderIri={job.target.targetRootFolderIri}
			folderName={job.target.targetRootFolderName}
			initialJob={job}
			onclose={() => {
				void goto(resolve('/projects'));
			}}
			onbusychange={() => {}}
			onimported={() => {}}
		/>{/key}
{:else}<p role="status">{m.mail_loading()}</p>{/if}
