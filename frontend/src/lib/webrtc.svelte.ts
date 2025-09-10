/* eslint-disable svelte/prefer-svelte-reactivity */
import {
    webSocketService,
    type OfferMessage,
    type AnswerMessage,
    type IceCandidateMessage,
    type WebSocketMessage,
    type RoomUsersMessage
} from './websocket.svelte';

class WebRTCService {
    private peerConnections = $state<Map<string, RTCPeerConnection>>(new Map());
    private localStream = $state<MediaStream | null>(null);
    private remoteStreams = $state<Map<string, MediaStream>>(new Map());

    private configuration: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    private messageHandler = (message: WebSocketMessage) => {
        this.handleWebSocketMessage(message);
    };

    constructor() {
        // Register message handler with WebSocket service
        webSocketService.addMessageHandler(this.messageHandler);
    }

    async initLocalStream(video: boolean = true, audio: boolean = true): Promise<MediaStream | null> {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
            console.log('Local stream initialized:', this.localStream);
            return this.localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            return null;
        }
    }

    private handleWebSocketMessage(message: WebSocketMessage) {
        console.log('WebRTC handling message:', message.type, message);
        
        switch (message.type) {
            case 'USER_JOINED':
                // Only create offer if this is not our own join message
                if (message.userId !== webSocketService.getUserId()) {
                    console.log('New user joined, creating peer connection:', message.userId);
                    this.createPeerConnection(message.userId);
                    // Add a small delay to ensure the other user is ready
                    setTimeout(() => {
                        this.createOffer(message.userId);
                    }, 1000);
                }
                break;

            case 'ROOM_USERS':
                // Handle existing users in room when we join
                const roomUsers = message as RoomUsersMessage;
                const currentUserId = webSocketService.getUserId();
                roomUsers.userIds.forEach(userId => {
                    if (userId !== currentUserId && !this.peerConnections.has(userId)) {
                        console.log('Creating peer connection for existing user:', userId);
                        this.createPeerConnection(userId);
                        // Don't create offer here - let the existing user do it
                    }
                });
                break;

            case 'OFFER':
                console.log('Handling offer from:', message.userId);
                this.handleOffer(message as OfferMessage);
                break;

            case 'ANSWER':
                console.log('Handling answer from:', message.userId);
                this.handleAnswer(message as AnswerMessage);
                break;

            case 'ICE_CANDIDATE':
                console.log('Handling ICE candidate from:', message.userId);
                this.handleIceCandidate(message as IceCandidateMessage);
                break;

            case 'USER_LEFT':
                console.log('User left, closing peer connection:', message.userId);
                this.closePeerConnection(message.userId);
                break;
        }
    }

    private createPeerConnection(userId: string): RTCPeerConnection {
        // Don't create duplicate connections
        if (this.peerConnections.has(userId)) {
            console.log('Peer connection already exists for:', userId);
            return this.peerConnections.get(userId)!;
        }

        console.log('Creating peer connection for:', userId);
        const pc = new RTCPeerConnection(this.configuration);

        // Add local stream tracks
        if (this.localStream) {
            console.log('Adding local stream tracks to peer connection for:', userId);
            this.localStream.getTracks().forEach((track) => {
                if (this.localStream) {
                    pc.addTrack(track, this.localStream);
                    console.log('Added track:', track.kind, 'to peer connection for:', userId);
                }
            });
        } else {
            console.warn('No local stream available when creating peer connection for:', userId);
        }

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log('Received remote stream from:', userId, event);
            const remoteStream = event.streams[0];
            if (remoteStream) {
                console.log('Setting remote stream for user:', userId, 'tracks:', remoteStream.getTracks().length);
                // Create new Map to trigger reactivity
                const newRemoteStreams = new Map(this.remoteStreams);
                newRemoteStreams.set(userId, remoteStream);
                this.remoteStreams = newRemoteStreams;
                console.log('Remote streams updated. Total remote streams:', this.remoteStreams.size);
            }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('Sending ICE candidate to:', userId);
                webSocketService.sendIceCandidate(userId, event.candidate.toJSON());
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${userId}:`, pc.connectionState);
            if (pc.connectionState === 'failed') {
                console.log('Connection failed, attempting to restart ICE');
                pc.restartIce();
            } else if (pc.connectionState === 'connected') {
                console.log(`Successfully connected to user: ${userId}`);
            }
        };

        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${userId}:`, pc.iceConnectionState);
        };

        this.peerConnections.set(userId, pc);
        return pc;
    }

    private async createOffer(userId: string) {
        const pc = this.peerConnections.get(userId);
        if (!pc) {
            console.error('No peer connection found for:', userId);
            return;
        }

        try {
            console.log('Creating offer for:', userId);
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            console.log('Sending offer to:', userId);
            webSocketService.sendOffer(userId, offer);
        } catch (error) {
            console.error('Error creating offer for:', userId, error);
        }
    }

    private async handleOffer(message: OfferMessage) {
        console.log('Handling offer from:', message.userId);
        
        // Create peer connection if it doesn't exist
        let pc = this.peerConnections.get(message.userId);
        if (!pc) {
            pc = this.createPeerConnection(message.userId);
        }

        try {
            console.log('Setting remote description from offer');
            await pc.setRemoteDescription(message.offer);
            
            console.log('Creating answer for:', message.userId);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            console.log('Sending answer to:', message.userId);
            webSocketService.sendAnswer(message.userId, answer);
        } catch (error) {
            console.error('Error handling offer from:', message.userId, error);
        }
    }

    private async handleAnswer(message: AnswerMessage) {
        const pc = this.peerConnections.get(message.userId);
        if (!pc) {
            console.error('No peer connection found for answer from:', message.userId);
            return;
        }

        try {
            console.log('Setting remote description from answer from:', message.userId);
            await pc.setRemoteDescription(message.answer);
            console.log('Successfully set remote description from answer');
        } catch (error) {
            console.error('Error handling answer from:', message.userId, error);
        }
    }

    private async handleIceCandidate(message: IceCandidateMessage) {
        const pc = this.peerConnections.get(message.userId);
        if (!pc) {
            console.error('No peer connection found for ICE candidate from:', message.userId);
            return;
        }

        try {
            if (pc.remoteDescription) {
                await pc.addIceCandidate(message.candidate);
                console.log('Added ICE candidate from:', message.userId);
            } else {
                console.log('Queuing ICE candidate from:', message.userId, '(no remote description yet)');
                // You might want to queue candidates here if remote description isn't set yet
            }
        } catch (error) {
            console.error('Error adding ICE candidate from:', message.userId, error);
        }
    }

    private closePeerConnection(userId: string) {
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
            console.log('Closed peer connection for:', userId);
        }
        
        // Create new Map to trigger reactivity
        const newRemoteStreams = new Map(this.remoteStreams);
        newRemoteStreams.delete(userId);
        this.remoteStreams = newRemoteStreams;
        console.log('Removed remote stream for:', userId, 'Remaining streams:', this.remoteStreams.size);
    }

    // Public method to manually create connections for existing users
    async connectToExistingUsers(userIds: string[]) {
        const currentUserId = webSocketService.getUserId();
        console.log('Connecting to existing users:', userIds);
        
        for (const userId of userIds) {
            if (userId !== currentUserId && !this.peerConnections.has(userId)) {
                console.log('Creating connection to existing user:', userId);
                this.createPeerConnection(userId);
                // Add delay between offers to prevent conflicts
                await new Promise(resolve => setTimeout(resolve, 500));
                this.createOffer(userId);
            }
        }
    }

    // Getters
    getRemoteStreams() {
        return this.remoteStreams;
    }

    getLocalStream() {
        return this.localStream;
    }

    getPeerConnections() {
        return this.peerConnections;
    }

    // Cleanup
    cleanup() {
        console.log('Cleaning up WebRTC service');
        // Remove message handler
        webSocketService.removeMessageHandler(this.messageHandler);

        this.peerConnections.forEach((pc, userId) => {
            console.log('Closing peer connection for:', userId);
            pc.close();
        });
        this.peerConnections.clear();
        this.remoteStreams = new Map();
        
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
                track.stop();
                console.log('Stopped local track:', track.kind);
            });
        }
        this.localStream = null;
        console.log('WebRTC cleanup completed');
    }
}

export const webRTCService = new WebRTCService();