package com.anishsarkar.webrtcvideocall.dto;

public enum MessageType {
    JOIN_ROOM,
    LEAVE_ROOM,
    OFFER,
    ANSWER,
    ICE_CANDIDATE,
    USER_JOINED,
    USER_LEFT,
    ERROR,
    ROOM_USERS
}
