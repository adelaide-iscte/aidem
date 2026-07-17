package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Modifying(flushAutomatically = true)
    @Query("""
        update SessionPlan sessionPlan
        set sessionPlan.generatedBy = null
        where sessionPlan.generatedBy.id = :userId
        """)
    int clearGeneratedByUser(
            @Param("userId") Long userId
    );
}