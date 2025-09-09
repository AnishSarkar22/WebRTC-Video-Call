package com.anishsarkar.webrtcvideocall.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class AnswerMessage extends BaseMessage {
    private JsonNode answer;

    public AnswerMessage() {
        super(MessageType.ANSWER, null, null);
    }

    public AnswerMessage(String roomId, String userId, String targetUserId, JsonNode answer) {
        super(MessageType.ANSWER, roomId, userId);
        setTargetUserId(targetUserId);
        this.answer = answer;
    }

    public JsonNode getAnswer() { return answer; }
    public void setAnswer(JsonNode answer) { this.answer = answer; }
}