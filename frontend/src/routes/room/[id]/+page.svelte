<script lang="ts">
    import { page } from '$app/stores';
    import { onMount, onDestroy } from 'svelte';
    import { webSocketService } from '$lib/websocket.svelte';
    import { webRTCService } from '$lib/webrtc.svelte';

    // Fallback for browsers that don't support crypto.randomUUID
    function uuidv4() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    let roomId = $page.params.id || '';
    let userId = (window.crypto && typeof window.crypto.randomUUID === 'function')
        ? window.crypto.randomUUID()
        : uuidv4();
    let userName = $state('');
    let localVideo = $state<HTMLVideoElement | null>(null);

    let joined = $state(false);
    let localStream = $state<MediaStream | null>(null);

    // Get reactive remote streams directly
    let remoteStreams = $derived(webRTCService.getRemoteStreams());
    let peerConnections = $derived(webRTCService.getPeerConnections());

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

        try {
            console.log('Starting to join room...');
            
            // Get local video stream first
            localStream = await webRTCService.initLocalStream();
            if (localStream && localVideo) {
                localVideo.srcObject = localStream;
                try {
                    await localVideo.play();
                    console.log('Local video playing');
                } catch (playError) {
                    console.error('Error playing local video:', playError);
                }
            }

            // Join the room via WebSocket
            console.log('Joining room via WebSocket...');
            webSocketService.joinRoom(roomId, userId, userName);
            joined = true;
            console.log('Successfully joined room');
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to access camera/microphone');
        }
    }

    function leaveRoom() {
        console.log('Leaving room...');
        webSocketService.leaveRoom();
        webRTCService.cleanup();
        joined = false;
        localStream = null;
    }

    // Svelte action to set video source for remote videos
    function setRemoteVideoSource(element: HTMLVideoElement, params: { stream: MediaStream; userId: string }) {
        async function updateVideo() {
            try {
                console.log('Setting video source for user:', params.userId);
                element.srcObject = params.stream;
                await element.play();
                console.log('Remote video playing for user:', params.userId);
            } catch (playError) {
                console.error('Error playing remote video for', params.userId, ':', playError);
            }
        }

        updateVideo();

        return {
            update(newParams: { stream: MediaStream; userId: string }) {
                if (newParams.stream !== params.stream || newParams.userId !== params.userId) {
                    params = newParams;
                    updateVideo();
                }
            }
        };
    }
</script>

<main>
    <div class="header">
        <h1>Room: {roomId}</h1>
        <div class="connection-status">
            {webSocketService.connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
    </div>

    {#if !joined}
        <div class="join-overlay">
            <div class="join-card">
                <h2>Join Video Call</h2>
                <div class="join-form">
                    <input 
                        type="text" 
                        bind:value={userName} 
                        placeholder="Enter your name" 
                        class="name-input" 
                    />
                    <button onclick={joinRoom} class="join-button">
                        Join Room
                    </button>
                </div>
            </div>
        </div>
    {:else}
        <div class="video-call-container">
            <!-- Control Bar -->
            <div class="control-bar">
                <div class="room-info">
                    <span>👥 {webSocketService.users.length} participants</span>
                </div>
                <button onclick={leaveRoom} class="leave-button">
                    Leave Call
                </button>
            </div>

            <!-- Video Grid -->
            <div class="video-grid" class:has-remote-users={remoteStreams.size > 0}>
                <!-- Main/Local Video -->
                <div class="main-video-container">
                    <video 
                        bind:this={localVideo} 
                        autoplay 
                        muted 
                        playsinline 
                        class="main-video"
                    ></video>
                    <div class="video-overlay">
                        <div class="user-name">You ({userName})</div>
                        <div class="video-controls">
                            <button class="control-btn muted">🎤</button>
                            <button class="control-btn">📹</button>
                        </div>
                    </div>
                </div>

                <!-- Remote Videos - Pop up as users join -->
                {#if remoteStreams.size > 0}
                    <div class="remote-videos-container">
                        {#each Array.from(remoteStreams.entries()) as [remoteUserId, stream] (remoteUserId)}
                            <div class="remote-video-card">
                                <video 
                                    autoplay 
                                    playsinline 
                                    class="remote-video"
                                    data-user-id={remoteUserId}
                                    use:setRemoteVideoSource={{ stream, userId: remoteUserId }}
                                >
                                    <track kind="captions">
                                </video>
                                <div class="remote-user-overlay">
                                    <div class="remote-user-name">
                                        {remoteUserId.substring(0, 8)}
                                    </div>
                                    <div class="connection-indicator" 
                                         class:connected={peerConnections.get(remoteUserId)?.connectionState === 'connected'}>
                                        {peerConnections.get(remoteUserId)?.connectionState === 'connected' ? '🟢' : '🟡'}
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Waiting Message (only show when no remote users) -->
            {#if remoteStreams.size === 0}
                <div class="waiting-message">
                    <div class="waiting-content">
                        <div class="waiting-icon">⏳</div>
                        <p>Waiting for others to join...</p>
                        <small>Share this room ID: <code>{roomId}</code></small>
                    </div>
                </div>
            {/if}

            <!-- Debug Info (collapsible) -->
            <details class="debug-info">
                <summary>Debug Information</summary>
                <div class="debug-content">
                    <p><strong>Room ID:</strong> {roomId}</p>
                    <p><strong>Your ID:</strong> {userId.substring(0, 8)}</p>
                    <p><strong>Connected peers:</strong> {remoteStreams.size}</p>
                    <p><strong>Peer connections:</strong> {peerConnections.size}</p>
                    
                    {#if peerConnections.size > 0}
                        <h4>Connection States:</h4>
                        <ul>
                            {#each Array.from(peerConnections.entries()) as [userId, pc]}
                                <li>{userId.substring(0, 8)}: {pc.connectionState}</li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </details>

            <!-- Error Messages -->
            {#if webSocketService.errors.length > 0}
                <div class="error-notifications">
                    {#each webSocketService.errors as error}
                        <div class="error-notification">
                            <span class="error-icon">⚠️</span>
                            {error.errorMessage}
                            <small>(Code: {error.errorCode})</small>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</main>

<style>
    * {
        box-sizing: border-box;
    }

    main {
        height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        overflow: hidden;
    }

    /* Header */
    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .header h1 {
        color: white;
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .connection-status {
        color: white;
        font-weight: 500;
        padding: 0.5rem 1rem;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 20px;
    }

    /* Join Screen */
    .join-overlay {
        height: calc(100vh - 80px);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .join-card {
        background: rgba(255, 255, 255, 0.95);
        padding: 3rem;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        text-align: center;
        min-width: 400px;
    }

    .join-card h2 {
        margin: 0 0 2rem 0;
        color: #333;
        font-weight: 600;
    }

    .join-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .name-input {
        padding: 1rem;
        border: 2px solid #e1e5e9;
        border-radius: 12px;
        font-size: 1rem;
        transition: border-color 0.3s;
    }

    .name-input:focus {
        outline: none;
        border-color: #667eea;
    }

    .join-button {
        padding: 1rem 2rem;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s;
    }

    .join-button:hover {
        transform: translateY(-2px);
    }

    /* Video Call Container */
    .video-call-container {
        height: calc(100vh - 80px);
        display: flex;
        flex-direction: column;
    }

    /* Control Bar */
    .control-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
    }

    .room-info {
        color: white;
        font-weight: 500;
    }

    .leave-button {
        padding: 0.75rem 1.5rem;
        background: #ff4757;
        color: white;
        border: none;
        border-radius: 25px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s;
    }

    .leave-button:hover {
        background: #ff3742;
    }

    /* Video Grid */
    .video-grid {
        flex: 1;
        display: flex;
        padding: 1rem;
        gap: 1rem;
        min-height: 0;
    }

    /* Main Video (takes full space when alone) */
    .main-video-container {
        flex: 1;
        position: relative;
        background: #000;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
    }

    /* Adjust main video when remote users are present */
    .video-grid.has-remote-users .main-video-container {
        flex: 0 0 70%;
        max-width: 70%;
    }

    .main-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .video-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
        padding: 2rem 1.5rem 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: end;
    }

    .user-name {
        color: white;
        font-weight: 600;
        font-size: 1.1rem;
    }

    .video-controls {
        display: flex;
        gap: 0.5rem;
    }

    .control-btn {
        width: 45px;
        height: 45px;
        border: none;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        cursor: pointer;
        font-size: 1.2rem;
        transition: background 0.3s;
    }

    .control-btn:hover {
        background: rgba(255, 255, 255, 0.3);
    }

    .control-btn.muted {
        background: rgba(255, 71, 87, 0.8);
    }

    /* Remote Videos Container */
    .remote-videos-container {
        flex: 0 0 28%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        max-height: 100%;
        overflow-y: auto;
    }

    .remote-video-card {
        position: relative;
        background: #000;
        border-radius: 15px;
        overflow: hidden;
        aspect-ratio: 16/9;
        min-height: 160px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        animation: slideInRight 0.3s ease-out;
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .remote-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .remote-user-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(rgba(0, 0, 0, 0.7), transparent);
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .remote-user-name {
        color: white;
        font-weight: 600;
        font-size: 0.9rem;
    }

    .connection-indicator {
        font-size: 0.8rem;
    }

    /* Waiting Message */
    .waiting-message {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: rgba(255, 255, 255, 0.8);
        z-index: 10;
    }

    .waiting-content {
        background: rgba(0, 0, 0, 0.3);
        padding: 2rem;
        border-radius: 20px;
        backdrop-filter: blur(10px);
    }

    .waiting-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        animation: pulse 2s infinite;
    }

    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }

    .waiting-content p {
        margin: 0 0 0.5rem 0;
        font-size: 1.2rem;
        font-weight: 500;
    }

    .waiting-content small {
        opacity: 0.8;
    }

    .waiting-content code {
        background: rgba(255, 255, 255, 0.2);
        padding: 0.25rem 0.5rem;
        border-radius: 5px;
        font-family: monospace;
    }

    /* Debug Info */
    .debug-info {
        margin: 1rem 2rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
    }

    .debug-info summary {
        padding: 1rem;
        background: rgba(0, 0, 0, 0.2);
        color: white;
        cursor: pointer;
        font-weight: 600;
    }

    .debug-content {
        padding: 1rem;
        color: white;
        font-size: 0.9rem;
    }

    .debug-content ul {
        margin: 0.5rem 0;
        padding-left: 1.5rem;
    }

    .debug-content li {
        font-family: monospace;
    }

    /* Error Notifications */
    .error-notifications {
        position: fixed;
        top: 100px;
        right: 2rem;
        z-index: 1000;
        max-width: 400px;
    }

    .error-notification {
        background: #ff4757;
        color: white;
        padding: 1rem;
        border-radius: 10px;
        margin-bottom: 0.5rem;
        box-shadow: 0 5px 15px rgba(255, 71, 87, 0.3);
        animation: slideInRight 0.3s ease-out;
    }

    .error-icon {
        margin-right: 0.5rem;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
        .video-grid {
            flex-direction: column;
            padding: 0.5rem;
        }

        .video-grid.has-remote-users .main-video-container {
            flex: 0 0 60%;
            max-width: 100%;
        }

        .remote-videos-container {
            flex: 0 0 35%;
            flex-direction: row;
            overflow-x: auto;
            overflow-y: visible;
        }

        .remote-video-card {
            flex: 0 0 200px;
            min-height: 150px;
        }

        .header {
            padding: 1rem;
        }

        .header h1 {
            font-size: 1.2rem;
        }

        .join-card {
            min-width: 300px;
            padding: 2rem;
            margin: 1rem;
        }
    }
</style>