<script lang="ts">
    import { goto } from '$app/navigation';
    
    let roomId = $state('');
    
    function joinRoom() {
        if (roomId.trim()) {
            goto(`/room/${roomId}`);
        }
    }
    
    function createRoom() {
        const newRoomId = crypto.randomUUID().substring(0, 8);
        goto(`/room/${newRoomId}`);
    }
</script>

<main>
    <h1>WebRTC Video Call</h1>
    
    <div class="options">
        <div class="option">
            <h2>Join Existing Room</h2>
            <input 
                type="text" 
                bind:value={roomId} 
                placeholder="Enter room ID"
                class="room-input"
            />
            <button onclick={joinRoom} class="button">
                Join Room
            </button>
        </div>
        
        <div class="option">
            <h2>Create New Room</h2>
            <button onclick={createRoom} class="button primary">
                Create Room
            </button>
        </div>
    </div>
</main>

<style>
    main {
        padding: 2rem;
        text-align: center;
        max-width: 600px;
        margin: 0 auto;
    }
    
    .options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        margin: 2rem 0;
    }
    
    .option {
        padding: 1.5rem;
        border: 1px solid #ddd;
        border-radius: 8px;
    }
    
    .room-input {
        width: 100%;
        padding: 0.5rem;
        margin: 1rem 0;
        border: 1px solid #ddd;
        border-radius: 4px;
    }
    
    .button {
        padding: 0.75rem 1.5rem;
        background-color: #6c757d;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .button.primary {
        background-color: #007bff;
    }
    
    .button:hover {
        opacity: 0.9;
    }
</style>
