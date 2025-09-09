package com.anishsarkar.webrtcvideocall.service;

import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {
    
    private final Map<String, Set<String>> rooms = new ConcurrentHashMap<>();
    private final Map<String, String> userNames = new ConcurrentHashMap<>();

    public void joinRoom(String roomId, String userId, String userName) {
        rooms.computeIfAbsent(roomId, k -> ConcurrentHashMap.newKeySet()).add(userId);
        userNames.put(userId, userName);
    }

    public void leaveRoom(String roomId, String userId) {
        Set<String> roomUsers = rooms.get(roomId);
        if (roomUsers != null) {
            roomUsers.remove(userId);
            if (roomUsers.isEmpty()) {
                rooms.remove(roomId);
            }
        }
        userNames.remove(userId);
    }

    public Set<String> getRoomUsers(String roomId) {
        return rooms.getOrDefault(roomId, Collections.emptySet());
    }

    public String getUserName(String userId) {
        return userNames.get(userId);
    }

    public boolean isUserInRoom(String roomId, String userId) {
        Set<String> roomUsers = rooms.get(roomId);
        return roomUsers != null && roomUsers.contains(userId);
    }

    public int getRoomSize(String roomId) {
        Set<String> roomUsers = rooms.get(roomId);
        return roomUsers != null ? roomUsers.size() : 0;
    }
}