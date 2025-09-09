package com.anishsarkar.webrtcvideocall.dto;

public class LeaveRoomMessage extends BaseMessage {
    public LeaveRoomMessage() {
        super(MessageType.LEAVE_ROOM, null, null);
    }

    public LeaveRoomMessage(String roomId, String userId) {
        super(MessageType.LEAVE_ROOM, roomId, userId);
    }
}
