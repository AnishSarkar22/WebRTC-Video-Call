package com.anishsarkar.webrtcvideocall.controller;

import com.anishsarkar.webrtcvideocall.dto.*;
import com.anishsarkar.webrtcvideocall.service.RoomService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@Controller
public class VideoCallController {

    private static final Logger logger = LoggerFactory.getLogger(VideoCallController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RoomService roomService;

    @MessageMapping("/join")
    public void joinRoom(@Payload JoinRoomMessage message, SimpMessageHeaderAccessor headerAccessor) {
        try {
            String roomId = message.getRoomId();
            String userId = message.getUserId();
            String userName = message.getUserName();

            logger.info("User {} joining room {}", userId, roomId);

            // Store session attributes with null check
            Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
            if (sessionAttributes != null) {
                sessionAttributes.put("roomId", roomId);
                sessionAttributes.put("userId", userId);
            } else {
                logger.warn("Session attributes are null for user {} joining room {}", userId, roomId);
            }

            // Join the room
            roomService.joinRoom(roomId, userId, userName);

            // Notify other users in the room
            UserJoinedMessage userJoinedMessage = new UserJoinedMessage(roomId, userId, userName);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, userJoinedMessage);

            RoomUsersMessage roomUsersMessage = new RoomUsersMessage(roomId, roomService.getRoomUsers(roomId));
            messagingTemplate.convertAndSend("/topic/room/" + roomId, roomUsersMessage);

            logger.info("User {} successfully joined room {}. Room size: {}", 
                       userId, roomId, roomService.getRoomSize(roomId));

        } catch (Exception e) {
            logger.error("Error joining room", e);
            sendErrorMessage(message.getRoomId(), message.getUserId(), 
                           "Failed to join room", "JOIN_ERROR");
        }
    }

    @MessageMapping("/leave")
    public void leaveRoom(@Payload LeaveRoomMessage message) {
        try {
            String roomId = message.getRoomId();
            String userId = message.getUserId();

            logger.info("User {} leaving room {}", userId, roomId);

            // Leave the room
            roomService.leaveRoom(roomId, userId);

            // Notify other users in the room
            UserLeftMessage userLeftMessage = new UserLeftMessage(roomId, userId);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, userLeftMessage);

            RoomUsersMessage roomUsersMessage = new RoomUsersMessage(roomId, roomService.getRoomUsers(roomId));
            messagingTemplate.convertAndSend("/topic/room/" + roomId, roomUsersMessage);

            logger.info("User {} successfully left room {}", userId, roomId);

        } catch (Exception e) {
            logger.error("Error leaving room", e);
            sendErrorMessage(message.getRoomId(), message.getUserId(), 
                           "Failed to leave room", "LEAVE_ERROR");
        }
    }

    @MessageMapping("/offer")
    public void handleOffer(@Payload OfferMessage message) {
        try {
            String roomId = message.getRoomId();
            String userId = message.getUserId();
            String targetUserId = message.getTargetUserId();

            logger.info("Handling offer from {} to {} in room {}", userId, targetUserId, roomId);

            if (!roomService.isUserInRoom(roomId, userId) || !roomService.isUserInRoom(roomId, targetUserId)) {
                sendErrorMessage(roomId, userId, "User not in room", "USER_NOT_IN_ROOM");
                return;
            }

            // Forward the offer to the target user
            messagingTemplate.convertAndSendToUser(targetUserId, "/queue/offer", message);

            logger.info("Offer forwarded from {} to {}", userId, targetUserId);

        } catch (Exception e) {
            logger.error("Error handling offer", e);
            sendErrorMessage(message.getRoomId(), message.getUserId(), 
                           "Failed to handle offer", "OFFER_ERROR");
        }
    }

    @MessageMapping("/answer")
    public void handleAnswer(@Payload AnswerMessage message) {
        try {
            String roomId = message.getRoomId();
            String userId = message.getUserId();
            String targetUserId = message.getTargetUserId();

            logger.info("Handling answer from {} to {} in room {}", userId, targetUserId, roomId);

            if (!roomService.isUserInRoom(roomId, userId) || !roomService.isUserInRoom(roomId, targetUserId)) {
                sendErrorMessage(roomId, userId, "User not in room", "USER_NOT_IN_ROOM");
                return;
            }

            // Forward the answer to the target user
            messagingTemplate.convertAndSendToUser(targetUserId, "/queue/answer", message);

            logger.info("Answer forwarded from {} to {}", userId, targetUserId);

        } catch (Exception e) {
            logger.error("Error handling answer", e);
            sendErrorMessage(message.getRoomId(), message.getUserId(), 
                           "Failed to handle answer", "ANSWER_ERROR");
        }
    }

    @MessageMapping("/ice-candidate")
    public void handleIceCandidate(@Payload IceCandidateMessage message) {
        try {
            String roomId = message.getRoomId();
            String userId = message.getUserId();
            String targetUserId = message.getTargetUserId();

            logger.info("Handling ICE candidate from {} to {} in room {}", userId, targetUserId, roomId);

            if (!roomService.isUserInRoom(roomId, userId) || !roomService.isUserInRoom(roomId, targetUserId)) {
                sendErrorMessage(roomId, userId, "User not in room", "USER_NOT_IN_ROOM");
                return;
            }

            // Forward the ICE candidate to the target user
            messagingTemplate.convertAndSendToUser(targetUserId, "/queue/ice-candidate", message);

        } catch (Exception e) {
            logger.error("Error handling ICE candidate", e);
            sendErrorMessage(message.getRoomId(), message.getUserId(), 
                           "Failed to handle ICE candidate", "ICE_CANDIDATE_ERROR");
        }
    }

    private void sendErrorMessage(String roomId, String userId, String errorMessage, String errorCode) {
        ErrorMessage error = new ErrorMessage(roomId, userId, errorMessage, errorCode);
        messagingTemplate.convertAndSendToUser(userId, "/queue/error", error);
    }
}
