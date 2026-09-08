package com.aidem.backend.repository;

import com.aidem.backend.model.Exercise;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ExerciseRepository extends JpaRepository<Exercise, Long> {

    List<Exercise> findByActiveTrue();

    Page<Exercise> findByActiveTrue(Pageable pageable);

    Page<Exercise> findByActiveTrueAndTitleContainingIgnoreCase(String title, Pageable pageable);
}