package com.aidem.backend.controller;

import com.aidem.backend.dto.chat.ChatContactResponse;
import com.aidem.backend.dto.chat.ChatMessageResponse;
import com.aidem.backend.dto.chat.SendChatMessageRequest;
import com.aidem.backend.service.ChatService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat/patients/{patientId}")
public class ChatController {

    private final ChatService chatService;

    public ChatController(
        ChatService chatService
    ) {
        this.chatService = chatService;
    }

    @GetMapping("/contact")
    public ChatContactResponse getContact(
        @PathVariable Long patientId,
        Authentication authentication
    ) {
        return chatService.getContact(
            patientId,
            authentication
        );
    }

    @GetMapping("/messages")
    public List<ChatMessageResponse> getMessages(
        @PathVariable Long patientId,
        @RequestParam(required = false) Long afterId,
        Authentication authentication
    ) {
        return chatService.getMessages(
            patientId,
            afterId,
            authentication
        );
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse sendMessage(
        @PathVariable Long patientId,
        @Valid @RequestBody SendChatMessageRequest request,
        Authentication authentication
    ) {
        return chatService.sendMessage(
            patientId,
            request,
            authentication
        );
    }
}