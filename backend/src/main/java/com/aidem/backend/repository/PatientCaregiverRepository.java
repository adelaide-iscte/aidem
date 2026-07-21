package com.aidem.backend.repository;

import com.aidem.backend.model.PatientCaregiver;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    @Modifying(flushAutomatically = true)
    @Query("""
        delete from PatientCaregiver association
        where association.user.id = :userId
        """)
    int deleteByUserId(
            @Param("userId") Long userId
    );

    List<PatientCaregiver> findByPatient_Id(
            Long patientId
    );
}