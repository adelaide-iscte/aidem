package com.aidem.backend.repository;

import com.aidem.backend.model.PatientCaregiver;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PatientCaregiverRepository
        extends JpaRepository<PatientCaregiver, Long> {

    @EntityGraph(attributePaths = {
            "patient",
            "user"
    })
    List<PatientCaregiver>
    findByUser_IdOrderByPatient_FullNameAsc(
            Long userId
    );

    @EntityGraph(attributePaths = {
            "patient",
            "user"
    })
    List<PatientCaregiver>
    findByUser_EmailIgnoreCaseOrderByPatient_FullNameAsc(
            String email
    );

    boolean existsByPatient_IdAndUser_EmailIgnoreCase(
            Long patientId,
            String email
    );
}