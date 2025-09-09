import { writable } from 'svelte/store';
import { io, type Socket } from 'socket.io-client';

interface WebRTCState {
    socket: Socket | null;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    rtcPeerConnection: RTCPeerConnection | null;
    isCaller: boolean;
    isConnected: boolean;
    roomName: string;
}

// const LOCAL_IP_ADDRESS = "YOUR_IP"; // Replace with your IP
const BACKEND_URL =
    typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : "http://localhost:8000";

const ICE_SERVER_HOST =
    typeof window !== "undefined"
        ? window.location.hostname
        : "localhost";

const initialState: WebRTCState = {
    socket: null,
    localStream: null,
    remoteStream: null,
    rtcPeerConnection: null,
    isCaller: false,
    isConnected: false,
    roomName: ''
};

export const webrtcStore = writable<WebRTCState>(initialState);

// ICE servers configuration
const iceServers = {
    iceServers: [
        { urls: `stun:${ICE_SERVER_HOST}:3478` },
        {
            urls: `turn:${ICE_SERVER_HOST}:3478`,
            username: "username",
            credential: "password"
        }
    ]
};

const streamConstraints = { audio: true, video: true };

export class WebRTCService {
    private socket: Socket;
    private remoteDescriptionPromise: Promise<void> | null = null;

    constructor() {
        this.socket = io(BACKEND_URL, {
            secure: window?.location.protocol === "https:",
            transports: ["websocket"]
        });
        this.setupSocketEvents();
        
        webrtcStore.update(state => ({
            ...state,
            socket: this.socket
        }));
    }

    private setupSocketEvents() {
        this.socket.on("created", this.handleCreated.bind(this));
        this.socket.on("joined", this.handleJoined.bind(this));
        this.socket.on("candidate", this.handleCandidate.bind(this));
        this.socket.on("ready", this.handleReady.bind(this));
        this.socket.on("offer", this.handleOffer.bind(this));
        this.socket.on("answer", this.handleAnswer.bind(this));
        this.socket.on("userDisconnected", this.handleUserDisconnected.bind(this));
        this.socket.on("setCaller", this.handleSetCaller.bind(this));
        this.socket.on("full", this.handleFull.bind(this));
    }

    async joinRoom(roomName: string): Promise<void> {
        this.socket.emit("joinRoom", roomName);
        webrtcStore.update(state => ({
            ...state,
            roomName,
            isConnected: true
        }));
    }

    private async handleCreated() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
            webrtcStore.update(state => ({
                ...state,
                localStream: stream,
                isCaller: true
            }));
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    }

    private async handleJoined() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
            webrtcStore.update(state => ({
                ...state,
                localStream: stream
            }));
            
            const currentState = await new Promise<WebRTCState>(resolve => {
                const unsubscribe = webrtcStore.subscribe(state => {
                    resolve(state);
                    unsubscribe();
                });
            });
            
            this.socket.emit("ready", currentState.roomName);
        } catch (error) {
            console.error("Error accessing media devices:", error);
        }
    }

    private handleCandidate(data: unknown) {
        webrtcStore.subscribe(state => {
            if (state.rtcPeerConnection) {
                const candidate = new RTCIceCandidate({
                    sdpMLineIndex: data.label,
                    candidate: data.candidate,
                });

                state.rtcPeerConnection.onicecandidateerror = (error) => {
                    console.error("Error adding ICE candidate: ", error);
                };

                if (this.remoteDescriptionPromise) {
                    this.remoteDescriptionPromise
                        .then(() => {
                            if (candidate != null) {
                                return state.rtcPeerConnection?.addIceCandidate(candidate);
                            }
                        })
                        .catch(error => console.log("Error adding ICE candidate after remote description: ", error));
                }
            }
        })();
    }

    private handleReady() {
        webrtcStore.subscribe(state => {
            if (state.isCaller && state.localStream) {
                const rtcPeerConnection = new RTCPeerConnection(iceServers);
                rtcPeerConnection.onicecandidate = this.onIceCandidate.bind(this);
                rtcPeerConnection.ontrack = this.onAddStream.bind(this);
                rtcPeerConnection.addTrack(state.localStream.getTracks()[0], state.localStream);
                rtcPeerConnection.addTrack(state.localStream.getTracks()[1], state.localStream);
                
                rtcPeerConnection
                    .createOffer()
                    .then(sessionDescription => {
                        rtcPeerConnection.setLocalDescription(sessionDescription);
                        this.socket.emit("offer", {
                            type: "offer",
                            sdp: sessionDescription,
                            room: state.roomName,
                        });
                    })
                    .catch(error => console.log(error));

                webrtcStore.update(currentState => ({
                    ...currentState,
                    rtcPeerConnection
                }));
            }
        })();
    }

    private handleOffer(data: unknown) {
        webrtcStore.subscribe(state => {
            if (!state.isCaller && state.localStream) {
                const rtcPeerConnection = new RTCPeerConnection(iceServers);
                rtcPeerConnection.onicecandidate = this.onIceCandidate.bind(this);
                rtcPeerConnection.ontrack = this.onAddStream.bind(this);
                rtcPeerConnection.addTrack(state.localStream.getTracks()[0], state.localStream);
                rtcPeerConnection.addTrack(state.localStream.getTracks()[1], state.localStream);

                if (rtcPeerConnection.signalingState === "stable") {
                    this.remoteDescriptionPromise = rtcPeerConnection.setRemoteDescription(
                        new RTCSessionDescription(data)
                    );
                    this.remoteDescriptionPromise
                        .then(() => {
                            return rtcPeerConnection.createAnswer();
                        })
                        .then(sessionDescription => {
                            rtcPeerConnection.setLocalDescription(sessionDescription);
                            this.socket.emit("answer", {
                                type: "answer",
                                sdp: sessionDescription,
                                room: state.roomName,
                            });
                        })
                        .catch(error => console.log(error));
                }

                webrtcStore.update(currentState => ({
                    ...currentState,
                    rtcPeerConnection
                }));
            }
        })();
    }

    private handleAnswer(data: unknown) {
        webrtcStore.subscribe(state => {
            if (state.isCaller && state.rtcPeerConnection?.signalingState === "have-local-offer") {
                this.remoteDescriptionPromise = state.rtcPeerConnection.setRemoteDescription(
                    new RTCSessionDescription(data)
                );
                this.remoteDescriptionPromise.catch(error => console.log(error));
            }
        })();
    }

    private handleUserDisconnected() {
        webrtcStore.update(state => ({
            ...state,
            remoteStream: null,
            isCaller: true
        }));
    }

    private handleSetCaller(callerId: string) {
        webrtcStore.update(state => ({
            ...state,
            isCaller: this.socket.id === callerId
        }));
    }

    private handleFull() {
        alert("Room is full!");
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    }

    private onIceCandidate(event: RTCPeerConnectionIceEvent) {
        if (event.candidate) {
            console.log("sending ice candidate");
            webrtcStore.subscribe(state => {
                this.socket.emit("candidate", {
                    type: "candidate",
                    label: event.candidate?.sdpMLineIndex,
                    id: event.candidate?.sdpMid,
                    candidate: event.candidate?.candidate,
                    room: state.roomName,
                });
            })();
        }
    }

    private onAddStream(event: RTCTrackEvent) {
        webrtcStore.update(state => ({
            ...state,
            remoteStream: event.streams[0]
        }));
    }

    toggleTrack(trackType: 'video' | 'audio'): void {
        webrtcStore.subscribe(state => {
            if (!state.localStream) return;

            const track = trackType === "video" 
                ? state.localStream.getVideoTracks()[0]
                : state.localStream.getAudioTracks()[0];
            
            if (track) {
                track.enabled = !track.enabled;
            }
        })();
    }

    disconnect(): void {
        this.socket.disconnect();
        webrtcStore.set(initialState);
    }
}