package com.anishsarkar.webrtcvideocall.dto;

import com.fasterxml.jackson.databind.JsonNode;

public class OfferMessage extends BaseMessage {
    private JsonNode offer;

    public OfferMessage() {
        super(MessageType.OFFER, null, null);
    }

    public OfferMessage(String roomId, String userId, String targetUserId, JsonNode offer) {
        super(MessageType.OFFER, roomId, userId);
        setTargetUserId(targetUserId);
        this.offer = offer;
    }

    public JsonNode getOffer() { return offer; }
    public void setOffer(JsonNode offer) { this.offer = offer; }
}