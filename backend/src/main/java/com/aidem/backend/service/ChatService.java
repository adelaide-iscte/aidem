package com.aidem.backend.service;

import com.aidem.backend.dto.chat.ChatContactResponse;
import com.aidem.backend.dto.chat.ChatMessageResponse;
import com.aidem.backend.dto.chat.SendChatMessageRequest;
import com.aidem.backend.model.ChatMessage;
import com.aidem.backend.model.Patient;
import com.aidem.backend.model.User;
import com.aidem.backend.model.enums.UserRole;
import com.aidem.backend.repository.ChatMessageRepository;
import com.aidem.backend.repository.PatientCaregiverRepository;
import com.aidem.backend.repository.PatientRepository;
import com.aidem.backend.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ChatService {

    private static final int INITIAL_MESSAGE_LIMIT = 100;
    private static final int MAX_MESSAGE_LENGTH = 2000;

    private final ChatMessageRepository chatMessageRepository;
    private final PatientRepository patientRepository;
    private final PatientCaregiverRepository patientCaregiverRepository;
    private final UserRepository userRepository;
    private final PatientAccessService patientAccessService;

    public ChatService(
        ChatMessageRepository chatMessageRepository,
        PatientRepository patientRepository,
        PatientCaregiverRepository patientCaregiverRepository,
        UserRepository userRepository,
        PatientAccessService patientAccessService
    ) {
        this.chatMessageRepository = chatMessageRepository;
        this.patientRepository = patientRepository;
        this.patientCaregiverRepository = patientCaregiverRepository;
        this.userRepository = userRepository;
        this.patientAccessService = patientAccessService;
    }

    @Transactional(readOnly = true)
    public ChatContactResponse getContact(
        Long patientId,
        Authentication authentication
    ) {
        ChatContext context = requireChatContext(
            patientId,
            authentication
        );

        User contact = context.contact();

        return new ChatContactResponse(
            contact.getId(),
            contact.getFullName(),
            contact.getRole().name()
        );
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getMessages(
        Long patientId,
        Long afterId,
        Authentication authentication
    ) {
        ChatContext context = requireChatContext(
            patientId,
            authentication
        );

        List<ChatMessage> messages;

        if (afterId == null) {
            messages = new ArrayList<>(
                chatMessageRepository.findLatestConversation(
                    patientId,
                    context.currentUser().getId(),
                    context.contact().getId(),
                    PageRequest.of(0, INITIAL_MESSAGE_LIMIT)
                )
            );

            messages.sort(
                Comparator.comparing(ChatMessage::getId)
            );
        } else {
            messages = chatMessageRepository.findConversationAfter(
                patientId,
                context.currentUser().getId(),
                context.contact().getId(),
                Math.max(0, afterId)
            );
        }

        return messages
            .stream()
            .map(message ->
                toResponse(
                    message,
                    context.currentUser().getId()
                )
            )
            .toList();
    }

    @Transactional
    public ChatMessageResponse sendMessage(
        Long patientId,
        SendChatMessageRequest request,
        Authentication authentication
    ) {
        ChatContext context = requireChatContext(
            patientId,
            authentication
        );

        String content =
            request == null || request.content() == null
                ? ""
                : request.content().trim();

        if (content.isBlank()) {
            throw badRequest(
                "A mensagem não pode estar vazia."
            );
        }

        if (content.length() > MAX_MESSAGE_LENGTH) {
            throw badRequest(
                "A mensagem não pode ultrapassar 2000 caracteres."
            );
        }

        ChatMessage savedMessage =
            chatMessageRepository.save(
                ChatMessage.builder()
                    .patient(context.patient())
                    .sender(context.currentUser())
                    .recipient(context.contact())
                    .content(content)
                    .build()
            );

        return toResponse(
            savedMessage,
            context.currentUser().getId()
        );
    }

    private ChatContext requireChatContext(
        Long patientId,
        Authentication authentication
    ) {
        if (patientId == null) {
            throw badRequest(
                "É necessário selecionar um utente."
            );
        }

        Patient patient = patientRepository
            .findById(patientId)
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Utente não encontrado."
                )
            );

        patientAccessService.requirePatientAccess(
            patientId,
            authentication
        );

        User currentUser = userRepository
            .findByEmailIgnoreCase(authentication.getName())
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Utilizador autenticado não encontrado."
                )
            );

        User contact = resolveContact(
            patientId,
            currentUser
        );

        return new ChatContext(
            patient,
            currentUser,
            contact
        );
    }

    private User resolveContact(
        Long patientId,
        User currentUser
    ) {
        return switch (currentUser.getRole()) {
            case INFORMAL_CAREGIVER ->
                findAssociatedCaregiver(
                    patientId,
                    UserRole.FORMAL_CAREGIVER,
                    currentUser.getId(),
                    "Não existe nenhum cuidador formal associado a este utente."
                );

            case ADMIN -> null;
            case FORMAL_CAREGIVER ->
                findAssociatedCaregiver(
                    patientId,
                    UserRole.INFORMAL_CAREGIVER,
                    currentUser.getId(),
                    "Não existe nenhum cuidador informal associado a este utente."
                );

            
        };
    }

    private User findAssociatedCaregiver(
        Long patientId,
        UserRole role,
        Long excludedUserId,
        String notFoundMessage
    ) {
        return patientCaregiverRepository
            .findByPatient_Id(patientId)
            .stream()
            .map(association -> association.getUser())
            .filter(user -> user.getRole() == role)
            .filter(user -> Boolean.TRUE.equals(user.getActive()))
            .filter(user -> !user.getId().equals(excludedUserId))
            .sorted(
                Comparator
                    .comparing(
                        User::getFullName,
                        String.CASE_INSENSITIVE_ORDER
                    )
                    .thenComparing(User::getId)
            )
            .findFirst()
            .orElseThrow(() ->
                new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    notFoundMessage
                )
            );
    }

    private ChatMessageResponse toResponse(
        ChatMessage message,
        Long currentUserId
    ) {
        return new ChatMessageResponse(
            message.getId(),
            message.getSender().getId(),
            message.getRecipient().getId(),
            message.getContent(),
            message.getSentAt(),
            message.getSender()
                .getId()
                .equals(currentUserId)
        );
    }

    private ResponseStatusException badRequest(
        String message
    ) {
        return new ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            message
        );
    }

    private record ChatContext(
        Patient patient,
        User currentUser,
        User contact
    ) {
    }
}