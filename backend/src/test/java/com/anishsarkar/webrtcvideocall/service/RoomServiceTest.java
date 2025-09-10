package com.anishsarkar.webrtcvideocall.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class RoomServiceTest {

    private RoomService roomService;

    @BeforeEach
    void setUp() {
        roomService = new RoomService();
    }

    @Test
    void testJoinRoomAddsUser() {
        roomService.joinRoom("room1", "user1", "Alice");
        assertTrue(roomService.isUserInRoom("room1", "user1"));
        assertEquals("Alice", roomService.getUserName("user1"));
    }

    @Test
    void testLeaveRoomRemovesUser() {
        roomService.joinRoom("room1", "user1", "Alice");
        roomService.leaveRoom("room1", "user1");
        assertFalse(roomService.isUserInRoom("room1", "user1"));
        assertNull(roomService.getUserName("user1"));
    }

    @Test
    void testGetRoomUsersReturnsCorrectUsers() {
        roomService.joinRoom("room1", "user1", "Alice");
        roomService.joinRoom("room1", "user2", "Bob");
        Set<String> users = roomService.getRoomUsers("room1");
        assertEquals(2, users.size());
        assertTrue(users.contains("user1"));
        assertTrue(users.contains("user2"));
    }

    @Test
    void testGetRoomSize() {
        roomService.joinRoom("room1", "user1", "Alice");
        roomService.joinRoom("room1", "user2", "Bob");
        assertEquals(2, roomService.getRoomSize("room1"));
        roomService.leaveRoom("room1", "user1");
        assertEquals(1, roomService.getRoomSize("room1"));
    }

    @Test
    void testLeaveRoomRemovesRoomWhenEmpty() {
        roomService.joinRoom("room1", "user1", "Alice");
        roomService.leaveRoom("room1", "user1");
        assertEquals(0, roomService.getRoomSize("room1"));
    }
}
