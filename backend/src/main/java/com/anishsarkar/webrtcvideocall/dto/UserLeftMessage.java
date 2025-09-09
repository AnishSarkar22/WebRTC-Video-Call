package com.anishsarkar.webrtcvideocall.dto;

public class UserLeftMessage extends BaseMessage {
    public UserLeftMessage() {
        super(MessageType.USER_LEFT, null, null);
    }

    public UserLeftMessage(String roomId, String userId) {
        super(MessageType.USER_LEFT, roomId, userId);
    }
}