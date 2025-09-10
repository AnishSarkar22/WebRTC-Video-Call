package com.anishsarkar.webrtcvideocall.controller;

import com.anishsarkar.webrtcvideocall.dto.JoinRoomMessage;
import com.anishsarkar.webrtcvideocall.dto.LeaveRoomMessage;
import com.anishsarkar.webrtcvideocall.service.RoomService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.*;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.HashMap;
import java.util.Set;

import static org.mockito.Mockito.*;

class VideoCallControllerTest {

    @InjectMocks
    private VideoCallController controller;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private RoomService roomService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void joinRoomShouldStoreSessionAttributesAndNotifyUsers() {
        JoinRoomMessage message = new JoinRoomMessage();
        message.setRoomId("room1");
        message.setUserId("user1");
        message.setUserName("Alice");

        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionAttributes(new HashMap<>());

        when(roomService.getRoomUsers("room1")).thenReturn(Set.of("user1"));

        controller.joinRoom(message, accessor);

        verify(roomService).joinRoom("room1", "user1", "Alice");
        verify(messagingTemplate, atLeastOnce()).convertAndSend(contains("/topic/room/room1"), (Object) any());
    }

    @Test
    void leaveRoomShouldNotifyUsers() {
        LeaveRoomMessage message = new LeaveRoomMessage();
        message.setRoomId("room1");
        message.setUserId("user1");

        when(roomService.getRoomUsers("room1")).thenReturn(Set.of());

        controller.leaveRoom(message);

        verify(roomService).leaveRoom("room1", "user1");
        verify(messagingTemplate, atLeastOnce()).convertAndSend(contains("/topic/room/room1"), any(Object.class));
    }
}
