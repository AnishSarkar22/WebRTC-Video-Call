import { Client } from '@stomp/stompjs';

export interface BaseMessage {
	type: string;
	roomId: string;
	userId: string;
	targetUserId?: string;
	timestamp: number;
}

export interface JoinRoomMessage extends BaseMessage {
	type: 'JOIN_ROOM';
	userName: string;
}

export interface UserJoinedMessage extends BaseMessage {
	type: 'USER_JOINED';
	userName: string;
}

export interface UserLeftMessage extends BaseMessage {
	type: 'USER_LEFT';
}

export interface OfferMessage extends BaseMessage {
	type: 'OFFER';
	offer: RTCSessionDescriptionInit;
}

export interface AnswerMessage extends BaseMessage {
	type: 'ANSWER';
	answer: RTCSessionDescriptionInit;
}

export interface IceCandidateMessage extends BaseMessage {
	type: 'ICE_CANDIDATE';
	candidate: RTCIceCandidateInit;
}

export interface ErrorMessage extends BaseMessage {
	type: 'ERROR';
	errorMessage: string;
	errorCode: string;
}

export type WebSocketMessage =
	| JoinRoomMessage
	| UserJoinedMessage
	| UserLeftMessage
	| OfferMessage
	| AnswerMessage
	| IceCandidateMessage
	| ErrorMessage
	| RoomUsersMessage;

class WebSocketService {
	private client: Client | null = $state(null);
	private roomId: string = $state('');
	private userId: string = $state('');
	private userName: string = $state('');

    setRoomId(roomId: string) {
        this.roomId = roomId;
    }

	// Reactive state
	connected = $state(false);
	users = $state<string[]>([]);
	messages = $state<WebSocketMessage[]>([]);
	errors = $state<ErrorMessage[]>([]);

	// Message handlers that can be set from components
	private messageHandlers = new Set<(message: WebSocketMessage) => void>();

	constructor() {
		this.client = new Client({
			brokerURL: 'ws://localhost:8080/ws',
			connectHeaders: {},
			debug: (str) => {
				console.log('STOMP Debug:', str);
			},
			reconnectDelay: 5000,
			heartbeatIncoming: 4000,
			heartbeatOutgoing: 4000
		});

		this.client.onConnect = (frame) => {
			console.log('Connected:', frame);
			this.connected = true;
			this.subscribeToTopics();
		};

		this.client.onDisconnect = () => {
			console.log('Disconnected');
			this.connected = false;
		};

		this.client.onStompError = (frame) => {
			console.error('STOMP error:', frame);
		};
	}

	// Method to add message handlers
	addMessageHandler(handler: (message: WebSocketMessage) => void) {
		this.messageHandlers.add(handler);
	}

	// Method to remove message handlers
	removeMessageHandler(handler: (message: WebSocketMessage) => void) {
		this.messageHandlers.delete(handler);
	}

	connect() {
		if (this.client) {
			this.client.activate();
		}
	}

	disconnect() {
		if (this.client && this.connected) {
			if (this.roomId && this.userId) {
				this.leaveRoom();
			}
			this.client.deactivate();
		}
	}

	private subscribeToTopics() {
		if (!this.client || !this.connected) return;

		// Subscribe to room updates
		if (this.roomId) {
			this.client.subscribe(`/topic/room/${this.roomId}`, (message) => {
				const data: WebSocketMessage = JSON.parse(message.body);
				this.handleMessage(data);
			});
		}

		// Subscribe to private messages
		this.client.subscribe('/user/queue/offer', (message) => {
			const data: OfferMessage = JSON.parse(message.body);
			this.handleMessage(data);
		});

		this.client.subscribe('/user/queue/answer', (message) => {
			const data: AnswerMessage = JSON.parse(message.body);
			this.handleMessage(data);
		});

		this.client.subscribe('/user/queue/ice-candidate', (message) => {
			const data: IceCandidateMessage = JSON.parse(message.body);
			this.handleMessage(data);
		});

		this.client.subscribe('/user/queue/error', (message) => {
			const data: ErrorMessage = JSON.parse(message.body);
			this.handleMessage(data);
		});
	}

	private handleMessage(message: WebSocketMessage) {
		console.log('Received message:', message);
		this.messages.push(message);

		// Call all registered message handlers
		this.messageHandlers.forEach((handler) => {
			try {
				handler(message);
			} catch (error) {
				console.error('Error in message handler:', error);
			}
		});

		switch (message.type) {
			case 'USER_JOINED': {
				const joinedMsg = message as UserJoinedMessage;
				if (!this.users.includes(joinedMsg.userId)) {
					this.users.push(joinedMsg.userId);
				}
				break;
			}

			case 'USER_LEFT': {
				const leftMsg = message as UserLeftMessage;
				this.users = this.users.filter((id) => id !== leftMsg.userId);
				break;
			}

			case 'ERROR': {
				const errorMsg = message as ErrorMessage;
				this.errors.push(errorMsg);
				break;
			}
			case 'ROOM_USERS': {
				const roomUsersMsg = message as RoomUsersMessage;
				this.users = [...roomUsersMsg.userIds];
				break;
			}
		}
	}

	joinRoom(roomId: string, userId: string, userName: string) {
		if (!this.client || !this.connected) {
			console.error('WebSocket not connected');
			return;
		}

		this.roomId = roomId;
		this.userId = userId;
		this.userName = userName;

		const message: JoinRoomMessage = {
			type: 'JOIN_ROOM',
			roomId,
			userId,
			userName,
			timestamp: Date.now()
		};

		this.client.publish({
			destination: '/app/join',
			body: JSON.stringify(message)
		});
	}

	leaveRoom() {
		if (!this.client || !this.connected || !this.roomId || !this.userId) return;

		const message = {
			type: 'LEAVE_ROOM',
			roomId: this.roomId,
			userId: this.userId,
			timestamp: Date.now()
		};

		this.client.publish({
			destination: '/app/leave',
			body: JSON.stringify(message)
		});
	}

	sendOffer(targetUserId: string, offer: RTCSessionDescriptionInit) {
		if (!this.client || !this.connected) return;

		const message: OfferMessage = {
			type: 'OFFER',
			roomId: this.roomId,
			userId: this.userId,
			targetUserId,
			offer,
			timestamp: Date.now()
		};

		this.client.publish({
			destination: '/app/offer',
			body: JSON.stringify(message)
		});
	}

	sendAnswer(targetUserId: string, answer: RTCSessionDescriptionInit) {
		if (!this.client || !this.connected) return;

		const message: AnswerMessage = {
			type: 'ANSWER',
			roomId: this.roomId,
			userId: this.userId,
			targetUserId,
			answer,
			timestamp: Date.now()
		};

		this.client.publish({
			destination: '/app/answer',
			body: JSON.stringify(message)
		});
	}

	sendIceCandidate(targetUserId: string, candidate: RTCIceCandidateInit) {
		if (!this.client || !this.connected) return;

		const message: IceCandidateMessage = {
			type: 'ICE_CANDIDATE',
			roomId: this.roomId,
			userId: this.userId,
			targetUserId,
			candidate,
			timestamp: Date.now()
		};

		this.client.publish({
			destination: '/app/ice-candidate',
			body: JSON.stringify(message)
		});
	}

	// Getters for reactive state
	getRoomId() {
		return this.roomId;
	}
	getUserId() {
		return this.userId;
	}
	getUserName() {
		return this.userName;
	}
}

export const webSocketService = new WebSocketService();
