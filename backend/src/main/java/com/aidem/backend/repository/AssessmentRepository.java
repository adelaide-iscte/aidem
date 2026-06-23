package com.aidem.backend.repository;

import com.aidem.backend.model.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {
    Optional<Assessment> findFirstByPatient_IdOrderByAssessmentDateDescIdDesc(Long patientId);
}
