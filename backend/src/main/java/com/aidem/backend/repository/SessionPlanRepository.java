package com.aidem.backend.repository;

import com.aidem.backend.model.SessionPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

public interface SessionPlanRepository
        extends JpaRepository<SessionPlan, Long> {

    List<SessionPlan>
    findByPatientIdAndSessionDateOrderByIdDesc(
            Long patientId,
            LocalDate sessionDate
    );

    List<SessionPlan>
    findByPatient_IdAndSessionDateBetweenOrderBySessionDateAscIdDesc(
            Long patientId,
            LocalDate startDate,
            LocalDate endDate
    );

    boolean existsByPatient_IdAndSessionDate(
            Long patientId,
            LocalDate sessionDate
    );

    List<SessionPlan>
    findByPatient_IdOrderBySessionDateDescIdDesc(
            Long patientId
    );

    @Query("""
    select sessionPlan.sessionDate
    from SessionPlan sessionPlan
    where sessionPlan.patient.id = :patientId
      and sessionPlan.sessionDate between :startDate and :endDate
    """)
    Set<LocalDate> findExistingDates(
            @Param("patientId") Long patientId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate
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