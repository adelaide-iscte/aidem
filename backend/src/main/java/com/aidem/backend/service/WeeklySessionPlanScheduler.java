package com.aidem.backend.service;

import com.aidem.backend.model.Patient;
import com.aidem.backend.repository.PatientRepository;
import jakarta.annotation.PostConstruct;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class WeeklySessionPlanScheduler {

    private static final ZoneId LISBON_ZONE = ZoneId.of("Europe/Lisbon");

    private final PatientRepository patientRepository;
    private final SessionPlanService sessionPlanService;

    public WeeklySessionPlanScheduler(PatientRepository patientRepository, SessionPlanService sessionPlanService) {
        this.patientRepository = patientRepository;
        this.sessionPlanService = sessionPlanService;
    }

    @PostConstruct
    public void generatePlansOnStartup() {
        generateRollingPlans();
    }

    @Scheduled(cron = "0 0 6 * * *", zone = "Europe/Lisbon")
    public void generateRollingPlans() {
        LocalDate today = LocalDate.now(LISBON_ZONE);

        List<Patient> patients = patientRepository.findAll();

        for (Patient patient : patients) {
            try {
                sessionPlanService.ensurePlanRange(patient.getId(), null, today, 14);
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
