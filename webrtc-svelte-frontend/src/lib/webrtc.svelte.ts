/* eslint-disable svelte/prefer-svelte-reactivity */
import {
    webSocketService,
    type OfferMessage,
    type AnswerMessage,
    type IceCandidateMessage,
    type WebSocketMessage
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
                if (message.userId !== webSocketService.getUserId()) {
                    console.log('Creating peer connection for new user:', message.userId);
                    this.createPeerConnection(message.userId);
                    this.createOffer(message.userId);
                }
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
        console.log('Creating peer connection for:', userId);
        const pc = new RTCPeerConnection(this.configuration);

        // Add local stream tracks
        if (this.localStream) {
            console.log('Adding local stream tracks to peer connection');
            this.localStream.getTracks().forEach((track) => {
                if (this.localStream) {
                    pc.addTrack(track, this.localStream);
                    console.log('Added track:', track.kind);
                }
            });
        }

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log('Received remote stream from:', userId, event);
            const remoteStream = event.streams[0];
            if (remoteStream) {
                console.log('Setting remote stream for user:', userId);
                // Create new Map to trigger reactivity
                const newRemoteStreams = new Map(this.remoteStreams);
                newRemoteStreams.set(userId, remoteStream);
                this.remoteStreams = newRemoteStreams;
                console.log('Remote streams updated:', this.remoteStreams.size);
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
            }
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
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            console.log('Sending offer to:', userId);
            webSocketService.sendOffer(userId, offer);
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    private async handleOffer(message: OfferMessage) {
        console.log('Handling offer from:', message.userId);
        const pc = this.createPeerConnection(message.userId);

        try {
            await pc.setRemoteDescription(message.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            console.log('Sending answer to:', message.userId);
            webSocketService.sendAnswer(message.userId, answer);
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    private async handleAnswer(message: AnswerMessage) {
        const pc = this.peerConnections.get(message.userId);
        if (!pc) {
            console.error('No peer connection found for answer from:', message.userId);
            return;
        }

        try {
            await pc.setRemoteDescription(message.answer);
            console.log('Set remote description from answer');
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    private async handleIceCandidate(message: IceCandidateMessage) {
        const pc = this.peerConnections.get(message.userId);
        if (!pc) {
            console.error('No peer connection found for ICE candidate from:', message.userId);
            return;
        }

        try {
            await pc.addIceCandidate(message.candidate);
            console.log('Added ICE candidate from:', message.userId);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    private closePeerConnection(userId: string) {
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
        }
        
        // Create new Map to trigger reactivity
        const newRemoteStreams = new Map(this.remoteStreams);
        newRemoteStreams.delete(userId);
        this.remoteStreams = newRemoteStreams;
        console.log('Closed peer connection and removed remote stream for:', userId);
    }

    // Getters
    getRemoteStreams() {
        return this.remoteStreams;
    }

    getLocalStream() {
        return this.localStream;
    }

    // Cleanup
    cleanup() {
        console.log('Cleaning up WebRTC service');
        // Remove message handler
        webSocketService.removeMessageHandler(this.messageHandler);

        this.peerConnections.forEach((pc) => pc.close());
        this.peerConnections.clear();
        this.remoteStreams = new Map();
        if (this.localStream) {
            this.localStream.getTracks().forEach((track) => track.stop());
        }
        this.localStream = null;
    }
}

export const webRTCService = new WebRTCService();