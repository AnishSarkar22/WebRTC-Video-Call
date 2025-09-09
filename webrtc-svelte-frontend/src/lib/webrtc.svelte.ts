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
			return this.localStream;
		} catch (error) {
			console.error('Error accessing media devices:', error);
			return null;
		}
	}

	private handleWebSocketMessage(message: WebSocketMessage) {
		switch (message.type) {
			case 'USER_JOINED':
				if (message.userId !== webSocketService.getUserId()) {
					this.createPeerConnection(message.userId);
					this.createOffer(message.userId);
				}
				break;

			case 'OFFER':
				this.handleOffer(message as OfferMessage);
				break;

			case 'ANSWER':
				this.handleAnswer(message as AnswerMessage);
				break;

			case 'ICE_CANDIDATE':
				this.handleIceCandidate(message as IceCandidateMessage);
				break;

			case 'USER_LEFT':
				this.closePeerConnection(message.userId);
				break;
		}
	}

	private createPeerConnection(userId: string): RTCPeerConnection {
		const pc = new RTCPeerConnection(this.configuration);

		// Add local stream tracks
		if (this.localStream) {
			this.localStream.getTracks().forEach((track) => {
				if (this.localStream) {
					pc.addTrack(track, this.localStream);
				}
			});
		}

		// Handle remote stream
		pc.ontrack = (event) => {
			console.log('Received remote stream from:', userId);
			this.remoteStreams.set(userId, event.streams[0]);
            this.remoteStreams = new Map(this.remoteStreams);
		};

		// Handle ICE candidates
		pc.onicecandidate = (event) => {
			if (event.candidate) {
				webSocketService.sendIceCandidate(userId, event.candidate.toJSON());
			}
		};

		// Handle connection state changes
		pc.onconnectionstatechange = () => {
			console.log(`Connection state with ${userId}:`, pc.connectionState);
		};

		this.peerConnections.set(userId, pc);
		return pc;
	}

	private async createOffer(userId: string) {
		const pc = this.peerConnections.get(userId);
		if (!pc) return;

		try {
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			webSocketService.sendOffer(userId, offer);
		} catch (error) {
			console.error('Error creating offer:', error);
		}
	}

	private async handleOffer(message: OfferMessage) {
		const pc = this.createPeerConnection(message.userId);

		try {
			await pc.setRemoteDescription(message.offer);
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			webSocketService.sendAnswer(message.userId, answer);
		} catch (error) {
			console.error('Error handling offer:', error);
		}
	}

	private async handleAnswer(message: AnswerMessage) {
		const pc = this.peerConnections.get(message.userId);
		if (!pc) return;

		try {
			await pc.setRemoteDescription(message.answer);
		} catch (error) {
			console.error('Error handling answer:', error);
		}
	}

	private async handleIceCandidate(message: IceCandidateMessage) {
		const pc = this.peerConnections.get(message.userId);
		if (!pc) return;

		try {
			await pc.addIceCandidate(message.candidate);
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
		this.remoteStreams.delete(userId);
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
		// Remove message handler
		webSocketService.removeMessageHandler(this.messageHandler);

		this.peerConnections.forEach((pc) => pc.close());
		this.peerConnections.clear();
		this.remoteStreams.clear();
		if (this.localStream) {
			this.localStream.getTracks().forEach((track) => track.stop());
		}
	}
}

export const webRTCService = new WebRTCService();
