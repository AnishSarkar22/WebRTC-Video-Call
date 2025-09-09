package com.anishsarkar.webrtcvideocall.dto;

import java.util.List;
import java.util.Set;

public class RoomUsersMessage extends BaseMessage {
    private List<String> userIds;

    public RoomUsersMessage() {
        super(MessageType.ROOM_USERS, null, null);
    }

    public RoomUsersMessage(String roomId, Set<String> userIds) {
        super(MessageType.ROOM_USERS, roomId, null);
        this.userIds = userIds.stream().toList();
    }

    public List<String> getUserIds() { return userIds; }
    public void setUserIds(List<String> userIds) { this.userIds = userIds; }
}
