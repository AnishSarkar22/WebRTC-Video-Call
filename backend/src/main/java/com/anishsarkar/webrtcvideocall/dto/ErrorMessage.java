package com.anishsarkar.webrtcvideocall.dto;

public class ErrorMessage extends BaseMessage {
    private String errorMessage;
    private String errorCode;

    public ErrorMessage() {
        super(MessageType.ERROR, null, null);
    }

    public ErrorMessage(String roomId, String userId, String errorMessage, String errorCode) {
        super(MessageType.ERROR, roomId, userId);
        this.errorMessage = errorMessage;
        this.errorCode = errorCode;
    }

    public String getErrorMessage() { return errorMessage; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    
    public String getErrorCode() { return errorCode; }
    public void setErrorCode(String errorCode) { this.errorCode = errorCode; }
}