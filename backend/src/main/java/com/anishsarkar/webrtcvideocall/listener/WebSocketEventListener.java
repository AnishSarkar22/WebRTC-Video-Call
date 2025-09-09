package com.anishsarkar.webrtcvideocall.listener;

import com.anishsarkar.webrtcvideocall.dto.UserLeftMessage;
import com.anishsarkar.webrtcvideocall.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;

@Component
public class WebSocketEventListener {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketEventListener.class);

    @Autowired
    private RoomService roomService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        try {
            StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
            Map<String, Object> sessionAttributes = headerAccessor.getSessionAttributes();
            
            if (sessionAttributes != null) {
                String roomId = (String) sessionAttributes.get("roomId");
                String userId = (String) sessionAttributes.get("userId");

                if (roomId != null && userId != null) {
                    logger.info("User {} disconnected from room {}", userId, roomId);
                    
                    // Remove user from room
                    roomService.leaveRoom(roomId, userId);
                    
                    // Notify other users
                    UserLeftMessage userLeftMessage = new UserLeftMessage(roomId, userId);
                    messagingTemplate.convertAndSend("/topic/room/" + roomId, userLeftMessage);
                    
                    logger.info("User {} cleanup completed for room {}", userId, roomId);
                } else {
                    logger.debug("Session disconnect event without roomId or userId in session attributes");
                }
            } else {
                logger.debug("Session disconnect event without session attributes");
            }
        } catch (Exception e) {
            logger.error("Error during disconnect cleanup", e);
        }
    }
}
