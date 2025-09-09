<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { webrtcStore, WebRTCService } from '$lib/stores/webrtc';

    let webrtcService: WebRTCService;
    let roomNameInput = $state('');
    let localVideoElement = $state<HTMLVideoElement>();
    let remoteVideoElement = $state<HTMLVideoElement>();

    let localStream = $state<MediaStream | null>(null);
    let remoteStream = $state<MediaStream | null>(null);
    let isConnected = $state(false);
    let isVideoEnabled = $state(true);
    let isAudioEnabled = $state(true);

    // Subscribe to WebRTC store changes
    $effect(() => {
        const unsubscribe = webrtcStore.subscribe(state => {
            localStream = state.localStream;
            remoteStream = state.remoteStream;
            isConnected = state.isConnected;
        });
        return unsubscribe;
    });

    // Update video elements when streams change
    $effect(() => {
        if (localVideoElement && localStream) {
            localVideoElement.srcObject = localStream;
        }
    });

    $effect(() => {
        if (remoteVideoElement && remoteStream) {
            remoteVideoElement.srcObject = remoteStream;
        }
    });

    onMount(() => {
        webrtcService = new WebRTCService();
    });

    onDestroy(() => {
        webrtcService?.disconnect();
    });

    async function connectToRoom() {
        if (!roomNameInput.trim()) {
            alert('Room name cannot be empty!');
            return;
        }
        await webrtcService.joinRoom(roomNameInput);
    }

    function toggleVideo() {
        webrtcService.toggleTrack('video');
        isVideoEnabled = !isVideoEnabled;
    }

    function toggleAudio() {
        webrtcService.toggleTrack('audio');
        isAudioEnabled = !isAudioEnabled;
    }
</script>

<svelte:head>
    <title>WebRTC SvelteKit</title>
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha2/dist/css/bootstrap.min.css"
        rel="stylesheet"
    />
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.3.0/font/bootstrap-icons.css"
    />
</svelte:head>

<main>
    <h1 class="text-center my-4">WebRTC SvelteKit</h1>

    {#if !isConnected}
        <div id="roomConfig" class="d-flex justify-content-center mb-3">
            <div class="input-group input-group-lg" style="max-width: 400px">
                <input
                    bind:value={roomNameInput}
                    type="text"
                    class="form-control form-control-lg"
                    placeholder="Enter room name"
                    onkeydown={(e) => e.key === 'Enter' && connectToRoom()}
                />
                <button onclick={connectToRoom} class="btn btn-primary btn-lg" type="button">
                    Connect
                </button>
            </div>
        </div>
    {:else}
        <div class="d-flex flex-column align-items-center mt-3">
            <!-- Remote video container -->
            <div
                class="remote-video-container"
                style="
                    width: 600px;
                    height: 450px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #363636;
                    border-radius: 8px;
                "
            >
                <video
                    bind:this={remoteVideoElement}
                    autoplay
                    style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px;"
                ></video>
            </div>

            <!-- Controls -->
            <div class="d-flex mt-3 gap-2">
                <button 
                    onclick={toggleVideo} 
                    class="btn-circle {isVideoEnabled ? 'enabled-style' : 'disabled-style'}"
                    aria-label={isVideoEnabled ? 'Disable video' : 'Enable video'}
                >
                    <i class="bi {isVideoEnabled ? 'bi-camera-video-fill' : 'bi-camera-video-off-fill'}"></i>
                </button>
                <button 
                    onclick={toggleAudio} 
                    class="btn-circle {isAudioEnabled ? 'enabled-style' : 'disabled-style'}"
                    aria-label={isAudioEnabled ? 'Mute audio' : 'Unmute audio'}
                >
                    <i class="bi {isAudioEnabled ? 'bi-mic-fill' : 'bi-mic-mute-fill'}"></i>
                </button>
            </div>

            <!-- Local video -->
            <video
                bind:this={localVideoElement}
                muted
                autoplay
                class="local-video"
                style="
                    width: 200px;
                    height: 150px;
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    border-radius: 8px;
                    border: 2px solid #fff;
                "
            ></video>
        </div>
    {/if}
</main>

<style>
    .btn-circle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .btn-circle:hover {
        transform: scale(1.05);
    }

    .bi {
        font-size: 20px;
        color: white;
    }

    .enabled-style {
        background-color: #008cff;
    }

    .disabled-style {
        background-color: #ff3030;
    }

    .local-video {
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .remote-video-container {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
</style>