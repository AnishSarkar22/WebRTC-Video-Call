package com.anishsarkar.webrtcvideocall.dto;

public class UserJoinedMessage extends BaseMessage {
    private String userName;

    public UserJoinedMessage() {
        super(MessageType.USER_JOINED, null, null);
    }

    public UserJoinedMessage(String roomId, String userId, String userName) {
        super(MessageType.USER_JOINED, roomId, userId);
        this.userName = userName;
    }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }
}