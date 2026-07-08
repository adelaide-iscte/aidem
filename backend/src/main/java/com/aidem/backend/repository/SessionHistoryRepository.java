package com.aidem.backend.repository;

import com.aidem.backend.model.SessionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SessionHistoryRepository extends JpaRepository<SessionHistory, Long> {
    List<SessionHistory> findByPatientIdOrderBySessionDateDesc(Long patientId);

    Optional<SessionHistory> findByPatientIdAndSessionDate(Long patientId, LocalDate sessionDate);

    void deleteByPatientIdAndSessionDate(Long patientId, LocalDate sessionDate);
}