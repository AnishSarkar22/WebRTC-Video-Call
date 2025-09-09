<script lang="ts">
	import { page } from '$app/stores';
	import { onMount, onDestroy } from 'svelte';
	import { webSocketService } from '$lib/websocket.svelte';
	import { webRTCService } from '$lib/webrtc.svelte';

	let roomId = $page.params.id || '';
	let userId = crypto.randomUUID();
	let userName = $state('');
	let localVideo = $state<HTMLVideoElement | null>(null);
	let remoteVideosContainer = $state<HTMLDivElement | null>(null);

	let joined = $state(false);
	let localStream = $state<MediaStream | null>(null);

	onMount(() => {
        webSocketService.setRoomId(roomId);
		webSocketService.connect();
	});

	onDestroy(() => {
		webRTCService.cleanup();
		webSocketService.disconnect();
	});

	async function joinRoom() {
		if (!userName.trim()) {
			alert('Please enter your name');
			return;
		}

		// Get local video stream
		localStream = await webRTCService.initLocalStream();
		if (localStream && localVideo) {
			localVideo.srcObject = localStream;
            await localVideo.play();
		}

		// Join the room via WebSocket
		webSocketService.joinRoom(roomId, userId, userName);
		joined = true;
	}

	function leaveRoom() {
		webSocketService.leaveRoom();
		webRTCService.cleanup();
		joined = false;
		localStream = null;
	}

	// Use $effect inside the component context to watch for remote stream changes
	$effect(() => {
		const remoteStreams = webRTCService.getRemoteStreams();
		updateRemoteVideos(remoteStreams);
	});

	function updateRemoteVideos(remoteStreams: Map<string, MediaStream>) {
		if (!remoteVideosContainer) return;

		// Clear existing videos
		remoteVideosContainer.innerHTML = '';

		// Add remote videos
		remoteStreams.forEach((stream, userId) => {
			const video = document.createElement('video');
			video.srcObject = stream;
			video.autoplay = true;
			video.playsInline = true;
			video.muted = false;
			video.className = 'remote-video';
			video.setAttribute('data-user-id', userId);

			const container = document.createElement('div');
			container.className = 'video-container';
			container.appendChild(video);

			const label = document.createElement('div');
			label.className = 'user-label';
			label.textContent = `User: ${userId.substring(0, 8)}`;
			container.appendChild(label);

			if (remoteVideosContainer) {
				remoteVideosContainer.appendChild(container);
			}
		});
	}
</script>

<main>
	<h1>Video Call Room: {roomId}</h1>

	<div class="connection-status">
		Status: {webSocketService.connected ? '🟢 Connected' : '🔴 Disconnected'}
	</div>

	{#if !joined}
		<div class="join-form">
			<input type="text" bind:value={userName} placeholder="Enter your name" class="name-input" />
			<button onclick={joinRoom} class="join-button"> Join Room </button>
		</div>
	{:else}
		<div class="video-call">
			<div class="controls">
				<button onclick={leaveRoom} class="leave-button"> Leave Room </button>
			</div>

			<div class="videos">
				<div class="local-video-container">
					<video bind:this={localVideo} autoplay muted playsinline class="local-video"></video>
					<div class="user-label">You ({userName})</div>
				</div>

				<div bind:this={remoteVideosContainer} class="remote-videos">
					<!-- Remote videos will be added here dynamically -->
				</div>
			</div>

			<div class="info">
				<h3>Room Info</h3>
				<p>Room ID: {roomId}</p>
				<p>Your ID: {userId.substring(0, 8)}</p>
				<p>Users in room: {webSocketService.users.length}</p>
			</div>

			{#if webSocketService.errors.length > 0}
				<div class="errors">
					<h3>Errors:</h3>
					{#each webSocketService.errors as error}
						<div class="error">
							{error.errorMessage} (Code: {error.errorCode})
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</main>

<style>
	main {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.connection-status {
		margin-bottom: 1rem;
		font-weight: bold;
	}

	.join-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-width: 300px;
		margin: 2rem auto;
	}

	.name-input {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.join-button,
	.leave-button {
		padding: 0.75rem 1.5rem;
		background-color: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.leave-button {
		background-color: #dc3545;
	}

	.videos {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 1rem;
		margin: 1rem 0;
	}

	.local-video-container,
	.video-container {
		position: relative;
		background: #000;
		border-radius: 8px;
		overflow: hidden;
	}

	.local-video,
	.remote-video {
		width: 100%;
		height: auto;
		display: block;
	}

	.user-label {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 0.5rem;
		font-size: 0.8rem;
	}

	.remote-videos {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.info {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		margin: 1rem 0;
	}

	.errors {
		background: #f8d7da;
		border: 1px solid #f5c6cb;
		color: #721c24;
		padding: 1rem;
		border-radius: 4px;
		margin: 1rem 0;
	}

	.error {
		margin: 0.5rem 0;
	}
</style>
