<script lang="ts">
    import { goto } from '$app/navigation';

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
    
    let roomId = $state('');
    
    function joinRoom() {
        if (roomId.trim()) {
            goto(`/room/${roomId}`);
        }
    }
    
    function createRoom() {
        const newRoomId = (window.crypto && typeof window.crypto.randomUUID === 'function')
        ? window.crypto.randomUUID().substring(0, 8)
        : uuidv4().substring(0, 8);
        goto(`/room/${newRoomId}`);
    }
</script>

<main>
    <div class="container">
        <div class="hero">
            <div class="video-icon">📹</div>
            <h1>WebRTC Video Call</h1>
            <p class="subtitle">Connect with friends and colleagues instantly</p>
        </div>
        
        <div class="options">
            <div class="option">
                <div class="option-header">
                    <div class="icon">🔗</div>
                    <h2>Join Existing Room</h2>
                </div>
                <p class="description">Enter a room ID to join an ongoing call</p>
                <input 
                    type="text" 
                    bind:value={roomId} 
                    placeholder="Enter room ID"
                    class="room-input"
                />
                <button onclick={joinRoom} class="button">
                    <span class="button-text">Join Room</span>
                </button>
            </div>
            
            <div class="option">
                <div class="option-header">
                    <div class="icon">➕</div>
                    <h2>Create New Room</h2>
                </div>
                <p class="description">Start a new video call room</p>
                <div class="create-placeholder"></div>
                <button onclick={createRoom} class="button primary">
                    <span class="button-text">Create Room</span>
                </button>
            </div>
        </div>
    </div>
</main>

<style>
    * {
        box-sizing: border-box;
    }

    main {
        min-height: 100vh;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .container {
        background: white;
        border-radius: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        padding: 3rem;
        max-width: 800px;
        width: 100%;
    }

    .hero {
        text-align: center;
        margin-bottom: 3rem;
    }

    .video-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    }

    h1 {
        margin: 0 0 0.5rem 0;
        font-size: 2.5rem;
        font-weight: 700;
        color: #2d3748;
        background: linear-gradient(135deg, #667eea, #764ba2);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }

    .subtitle {
        color: #718096;
        font-size: 1.1rem;
        margin: 0;
    }
    
    .options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
    }

    @media (max-width: 768px) {
        .options {
            grid-template-columns: 1fr;
            gap: 1.5rem;
        }
        
        .container {
            padding: 2rem;
        }

        h1 {
            font-size: 2rem;
        }
    }
    
    .option {
        padding: 2rem;
        border: 2px solid #e2e8f0;
        border-radius: 16px;
        background: #f8fafc;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .option::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4px;
        background: linear-gradient(90deg, #667eea, #764ba2);
        transform: scaleX(0);
        transition: transform 0.3s ease;
    }

    .option:hover {
        border-color: #667eea;
        background: white;
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
        transform: translateY(-2px);
    }

    .option:hover::before {
        transform: scaleX(1);
    }

    .option-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .icon {
        font-size: 1.5rem;
        background: linear-gradient(135deg, #667eea, #764ba2);
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: grayscale(0.3);
    }

    h2 {
        margin: 0;
        color: #2d3748;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .description {
        color: #718096;
        margin: 0 0 1.5rem 0;
        font-size: 0.9rem;
        line-height: 1.5;
    }

    .create-placeholder {
        height: 48px;
        margin: 1rem 0;
    }
    
    .room-input {
        width: 100%;
        padding: 0.875rem 1rem;
        margin: 1rem 0;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        font-size: 1rem;
        transition: all 0.3s ease;
        background: white;
    }

    .room-input:focus {
        outline: none;
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        transform: translateY(-1px);
    }

    .room-input::placeholder {
        color: #a0aec0;
    }
    
    .button {
        width: 100%;
        padding: 0.875rem 1.5rem;
        background: linear-gradient(135deg, #4a5568, #2d3748);
        color: white;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        font-weight: 600;
        font-size: 1rem;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    
    .button.primary {
        background: linear-gradient(135deg, #667eea, #764ba2);
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
    }
    
    .button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .button.primary:hover {
        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
    }

    .button:active {
        transform: translateY(0);
    }

    .button-text {
        position: relative;
        z-index: 2;
    }

    .button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s ease;
    }

    .button:hover::before {
        left: 100%;
    }
</style>