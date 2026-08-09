package com.aidem.backend.service;

import com.aidem.backend.model.Patient;
import com.aidem.backend.repository.PatientRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class WeeklySessionPlanScheduler {

    private final PatientRepository patientRepository;
    private final SessionPlanService sessionPlanService;

    public WeeklySessionPlanScheduler(
            PatientRepository patientRepository,
            SessionPlanService sessionPlanService
    ) {
        this.patientRepository =
                patientRepository;

        this.sessionPlanService =
                sessionPlanService;
    }

    @Scheduled(
            cron = "0 0 6 * * *",
            zone = "Europe/Lisbon"
    )
    public void generateRollingPlans() {
        LocalDate today = LocalDate.now();

        List<Patient> patients =
                patientRepository.findAll();

        for (Patient patient : patients) {
            try {
                sessionPlanService
                        .getOrGeneratePlanRange(
                                patient.getId(),
                                null,
                                today,
                                14
                        );

            } catch (IllegalStateException exception) {
                System.err.println(
                        "Não foi possível atualizar os planos dos próximos 14 dias " +
                                "do utente " +
                                patient.getId() +
                                ": " +
                                exception.getMessage()
                );

            } catch (Exception exception) {
                System.err.println(
                        "Erro ao atualizar os planos dos próximos 14 dias " +
                                "do utente " +
                                patient.getId() +
                                ": " +
                                exception.getMessage()
                );
            }
        }
    }
}