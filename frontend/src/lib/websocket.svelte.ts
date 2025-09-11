import { Client } from '@stomp/stompjs';

const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000/ws';

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

export interface RoomUsersMessage extends BaseMessage {
	type: 'ROOM_USERS';
	userIds: string[];
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

	// Message handlers
	private messageHandlers = new Set<(message: WebSocketMessage) => void>();

	constructor() {
		this.client = new Client({
			brokerURL: WEBSOCKET_URL,
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
		};

		this.client.onDisconnect = () => {
			console.log('Disconnected');
			this.connected = false;
		};

		this.client.onStompError = (frame) => {
			console.error('STOMP error:', frame);
		};
	}

	addMessageHandler(handler: (message: WebSocketMessage) => void) {
		this.messageHandlers.add(handler);
	}

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

	// Subscribe to topics after roomId is set and connection is established
	private subscribeToTopics() {
		if (!this.client || !this.connected || !this.roomId) return;

		console.log('Subscribing to room topic:', this.roomId);

		// Subscribe to room updates - ALL messages come through here now
		this.client.subscribe(`/topic/room/${this.roomId}`, (message) => {
			const data: WebSocketMessage = JSON.parse(message.body);

			// Filter messages: only handle if it's for everyone OR specifically for this user
			if (!data.targetUserId || data.targetUserId === this.userId) {
				this.handleMessage(data);
			} else {
				console.log(
					'Ignoring message not for this user:',
					data.type,
					'from:',
					data.userId,
					'to:',
					data.targetUserId
				);
			}
		});
	}

	private handleMessage(message: WebSocketMessage) {
		console.log(
			'Handling message:',
			message.type,
			'from:',
			message.userId,
			'to:',
			message.targetUserId || 'everyone'
		);
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
					this.users = [...this.users, joinedMsg.userId];
					console.log('User joined:', joinedMsg.userId, 'Total users:', this.users.length);
				}
				break;
			}

			case 'USER_LEFT': {
				const leftMsg = message as UserLeftMessage;
				this.users = this.users.filter((id) => id !== leftMsg.userId);
				console.log('User left:', leftMsg.userId, 'Remaining users:', this.users.length);
				break;
			}

			case 'ERROR': {
				const errorMsg = message as ErrorMessage;
				this.errors = [...this.errors, errorMsg];
				break;
			}

			case 'ROOM_USERS': {
				const roomUsersMsg = message as RoomUsersMessage;
				this.users = [...roomUsersMsg.userIds];
				console.log('Room users updated:', this.users);
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

		// Subscribe to topics now that we have roomId
		this.subscribeToTopics();

		const message: JoinRoomMessage = {
			type: 'JOIN_ROOM',
			roomId,
			userId,
			userName,
			timestamp: Date.now()
		};

		console.log('Sending join room message:', message);
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

		console.log('Sending offer to:', targetUserId);
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

		console.log('Sending answer to:', targetUserId);
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
