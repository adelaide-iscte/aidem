package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface SessionPlanRepository extends JpaRepository<SessionPlan, Long> {
    Optional<SessionPlan> findByPatientIdAndSessionDate(Long patientId, LocalDate sessionDate);
}
