package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface SessionPlanRepository
        extends JpaRepository<SessionPlan, Long> {

    List<SessionPlan> findByPatientIdAndSessionDateOrderByIdDesc(
            Long patientId,
            LocalDate sessionDate
    );

    List<SessionPlan> findByPatient_IdOrderBySessionDateDescIdDesc(
            Long patientId
    );
}