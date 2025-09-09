package com.anishsarkar.webrtcvideocall.dto;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.validation.constraints.NotNull;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = JoinRoomMessage.class, name = "JOIN_ROOM"),
    @JsonSubTypes.Type(value = LeaveRoomMessage.class, name = "LEAVE_ROOM"),
    @JsonSubTypes.Type(value = OfferMessage.class, name = "OFFER"),
    @JsonSubTypes.Type(value = AnswerMessage.class, name = "ANSWER"),
    @JsonSubTypes.Type(value = IceCandidateMessage.class, name = "ICE_CANDIDATE"),
    @JsonSubTypes.Type(value = UserJoinedMessage.class, name = "USER_JOINED"),
    @JsonSubTypes.Type(value = UserLeftMessage.class, name = "USER_LEFT"),
    @JsonSubTypes.Type(value = ErrorMessage.class, name = "ERROR"),
    @JsonSubTypes.Type(value = RoomUsersMessage.class, name = "ROOM_USERS")
})
public abstract class BaseMessage {
    @NotNull
    private MessageType type;
    @NotNull
    private String roomId;
    @NotNull
    private String userId;
    private String targetUserId;
    private long timestamp;

    public BaseMessage() {
        this.timestamp = System.currentTimeMillis();
    }

    public BaseMessage(MessageType type, String roomId, String userId) {
        this.type = type;
        this.roomId = roomId;
        this.userId = userId;
        this.timestamp = System.currentTimeMillis();
    }

    // Getters and setters
    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }
    
    public String getRoomId() { return roomId; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getTargetUserId() { return targetUserId; }
    public void setTargetUserId(String targetUserId) { this.targetUserId = targetUserId; }
    
    public long getTimestamp() { return timestamp; }
    public void setTimestamp(long timestamp) { this.timestamp = timestamp; }
}
