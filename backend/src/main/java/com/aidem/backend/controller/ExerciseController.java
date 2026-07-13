package com.aidem.backend.controller;

import com.aidem.backend.dto.exercise.ExerciseRequest;
import com.aidem.backend.model.Exercise;
import com.aidem.backend.repository.ExerciseRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;

@RestController
@RequestMapping("/api/exercises")
@CrossOrigin(origins = "*")
public class ExerciseController {

    private final ExerciseRepository exerciseRepository;

    public ExerciseController(
            ExerciseRepository exerciseRepository
    ) {
        this.exerciseRepository = exerciseRepository;
    }

    @GetMapping
    public Page<Exercise> getAllExercises(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String search
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(
                Math.max(size, 1),
                100
        );

        Pageable pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(
                        Sort.Direction.ASC,
                        "title"
                )
        );

        String normalizedSearch =
                search == null
                        ? ""
                        : search.trim();

        if (normalizedSearch.isEmpty()) {
            return exerciseRepository
                    .findByActiveTrue(pageable);
        }

        return exerciseRepository
                .findByActiveTrueAndTitleContainingIgnoreCase(
                        normalizedSearch,
                        pageable
                );
    }

    @GetMapping("/{id}")
    public Exercise getExerciseById(
            @PathVariable Long id
    ) {
        return findExercise(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Exercise> createExercise(
            @RequestBody ExerciseRequest request
    ) {
        validateRequest(request);

        Exercise exercise = new Exercise();

        applyRequest(exercise, request);
        exercise.setActive(true);

        Exercise saved =
                exerciseRepository.save(exercise);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public Exercise updateExercise(
            @PathVariable Long id,
            @RequestBody ExerciseRequest request
    ) {
        validateRequest(request);

        Exercise exercise = findExercise(id);

        applyRequest(exercise, request);

        return exerciseRepository.save(exercise);
    }

    /**
     * Soft delete: mantém a atividade na base de dados
     * para não quebrar sessões e históricos antigos.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<Void> deleteExercise(
            @PathVariable Long id
    ) {
        Exercise exercise = findExercise(id);

        exercise.setActive(false);
        exerciseRepository.save(exercise);

        return ResponseEntity.noContent().build();
    }

    private Exercise findExercise(Long id) {
        return exerciseRepository
                .findById(id)
                .orElseThrow(
                        () -> new RuntimeException(
                                "Atividade não encontrada."
                        )
                );
    }

    private void validateRequest(
            ExerciseRequest request
    ) {
        if (
                request.getTitle() == null ||
                        request.getTitle().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "O nome da atividade é obrigatório."
            );
        }

        if (
                request.getDomain() == null ||
                        request.getDomain().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "O domínio é obrigatório."
            );
        }

        if (request.getActivityType() == null) {
            throw new IllegalArgumentException(
                    "O tipo de atividade é obrigatório."
            );
        }

        if (request.getDifficultyLevel() == null) {
            throw new IllegalArgumentException(
                    "A dificuldade é obrigatória."
            );
        }
    }

    private void applyRequest(
            Exercise exercise,
            ExerciseRequest request
    ) {
        exercise.setTitle(request.getTitle().trim());
        exercise.setDescription(request.getDescription());
        exercise.setDomain(request.getDomain().trim());

        exercise.setActivityType(
                request.getActivityType()
        );

        exercise.setDifficultyLevel(
                request.getDifficultyLevel()
        );

        exercise.setDurationMinutes(
                defaultNumber(
                        request.getDurationMinutes()
                )
        );

        exercise.setSets(
                defaultNumber(request.getSets())
        );

        exercise.setRepetitions(
                defaultNumber(
                        request.getRepetitions()
                )
        );

        exercise.setRestSeconds(
                defaultNumber(
                        request.getRestSeconds()
                )
        );

        exercise.setMaterials(request.getMaterials());
        exercise.setInstructions(
                request.getInstructions()
        );
        exercise.setMediaUrl(request.getMediaUrl());
    }

    private Integer defaultNumber(Integer value) {
        return value == null || value < 0
                ? 0
                : value;
    }
}