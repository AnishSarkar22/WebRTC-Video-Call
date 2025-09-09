package com.anishsarkar.webrtcvideocall.dto;

public class JoinRoomMessage extends BaseMessage {
    private String userName;

    public JoinRoomMessage() {
        super(MessageType.JOIN_ROOM, null, null);
    }

    public JoinRoomMessage(String roomId, String userId, String userName) {
        super(MessageType.JOIN_ROOM, roomId, userId);
        this.userName = userName;
    }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
}