package com.aidem.backend.repository;

import com.aidem.backend.model.SessionHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SessionHistoryRepository extends JpaRepository<SessionHistory, Long> {
    List<SessionHistory> findByPatientIdOrderBySessionDateDesc(Long patientId);
}