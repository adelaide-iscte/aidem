package com.aidem.backend.repository;

import com.aidem.backend.model.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    Optional<Assessment> findFirstByPatient_IdOrderByAssessmentDateDescIdDesc(Long patientId);
    List<Assessment> findByPatient_Id(Long patientId);
    @Modifying(flushAutomatically = true)
    @Query("""
        update Assessment assessment
        set assessment.performedBy = null
        where assessment.performedBy.id = :userId
        """)
    int clearPerformedByUser(
            @Param("userId") Long userId
    );



}
