package com.anishsarkar.webrtcvideocall.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class IceCandidateMessage extends BaseMessage {
    private JsonNode candidate;

    public IceCandidateMessage() {
        super(MessageType.ICE_CANDIDATE, null, null);
    }

    public IceCandidateMessage(String roomId, String userId, String targetUserId, JsonNode candidate) {
        super(MessageType.ICE_CANDIDATE, roomId, userId);
        setTargetUserId(targetUserId);
        this.candidate = candidate;
    }

    public JsonNode getCandidate() { return candidate; }
    public void setCandidate(JsonNode candidate) { this.candidate = candidate; }
}
