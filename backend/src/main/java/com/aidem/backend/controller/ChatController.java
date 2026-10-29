package com.aidem.backend.controller;

import com.aidem.backend.dto.chat.ChatContactResponse;
import com.aidem.backend.dto.chat.ChatConversationResponse;
import com.aidem.backend.dto.chat.ChatMessageResponse;
import com.aidem.backend.dto.chat.SendChatMessageRequest;
import com.aidem.backend.service.ChatService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/contacts")
    public List<ChatContactResponse> getContacts(Authentication authentication) {
        return chatService.getContacts(authentication);
    }

    @GetMapping("/conversations")
    public List<ChatConversationResponse> getConversations(Authentication authentication) {
        return chatService.getConversations(authentication);
    }

    @GetMapping("/conversations/{contactId}/messages")
    public List<ChatMessageResponse> getMessages(
        @PathVariable Long contactId,
        @RequestParam(required = false) Long afterId,
        Authentication authentication
    ) {
        return chatService.getMessages(contactId, afterId, authentication);
    }

    @PostMapping("/conversations/{contactId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse sendMessage(
        @PathVariable Long contactId,
        @Valid @RequestBody SendChatMessageRequest request,
        Authentication authentication
    ) {
        return chatService.sendMessage(contactId, request, authentication);
    }
}
