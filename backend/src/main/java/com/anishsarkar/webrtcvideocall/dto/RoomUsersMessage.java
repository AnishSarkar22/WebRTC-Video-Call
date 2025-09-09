package com.anishsarkar.webrtcvideocall.dto;

import java.util.Set;

public class RoomUsersMessage extends BaseMessage {
    private Set<String> userIds;

    public RoomUsersMessage() {
        super(MessageType.ROOM_USERS, null, null);
    }

    public RoomUsersMessage(String roomId, Set<String> userIds) {
        super(MessageType.ROOM_USERS, roomId, null);
        this.userIds = userIds;
    }

    public Set<String> getUserIds() { return userIds; }
    public void setUserIds(Set<String> userIds) { this.userIds = userIds; }
}
