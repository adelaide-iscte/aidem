package com.aidem.backend.repository;

import com.aidem.backend.model.ChatMessage;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query(
        """
        select message
        from ChatMessage message
        where (
            (
                message.sender.id = :currentUserId
                and message.recipient.id = :contactId
            )
            or
            (
                message.sender.id = :contactId
                and message.recipient.id = :currentUserId
            )
        )
        order by message.id desc
        """
    )
    List<ChatMessage> findLatestConversation(
        @Param("currentUserId") Long currentUserId,
        @Param("contactId") Long contactId,
        Pageable pageable
    );

    @Query(
        """
        select message
        from ChatMessage message
        where message.id > :afterId
          and (
            (
                message.sender.id = :currentUserId
                and message.recipient.id = :contactId
            )
            or
            (
                message.sender.id = :contactId
                and message.recipient.id = :currentUserId
            )
          )
        order by message.id asc
        """
    )
    List<ChatMessage> findConversationAfter(
        @Param("currentUserId") Long currentUserId,
        @Param("contactId") Long contactId,
        @Param("afterId") Long afterId
    );

    @Query(
        """
        select message
        from ChatMessage message
        where message.sender.id = :userId
           or message.recipient.id = :userId
        order by message.id desc
        """
    )
    List<ChatMessage> findAllConversationsForUser(@Param("userId") Long userId);

    @Modifying(flushAutomatically = true)
    @Query(
        """
        delete from ChatMessage message
        where message.sender.id = :userId
           or message.recipient.id = :userId
        """
    )
    int deleteByUserId(@Param("userId") Long userId);
}
