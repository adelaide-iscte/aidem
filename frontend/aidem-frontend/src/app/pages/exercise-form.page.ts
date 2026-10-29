import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ExerciseFormComponent } from '../features/exercise-form/exercise-form.component';
import { LoadingSpinnerComponent } from '../shared/laoding-spinner-modal/loading-spinner.component';
import { Exercise, ExerciseService } from '../core/services/exercise.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-exercise-form-page',
  standalone: true,
  imports: [ExerciseFormComponent, LoadingSpinnerComponent],
  template: `
    @if (isLoading()) {
      <app-loading-spinner message="A carregar exercício..."></app-loading-spinner>
    } @else if (errorMessage()) {
      <p>{{ errorMessage() }}</p>
    } @else {
      <app-exercise-form [exerciseToEdit]="exercise()" (goBack)="close()" (saved)="close()">
      </app-exercise-form>
    }
  `,
})
export class ExerciseFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly exerciseService = inject(ExerciseService);
  private readonly nav = inject(AppNavigationService);

  readonly exercise = signal<Exercise | null>(null);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');

  async ngOnInit(): Promise<void> {
    const exerciseId = this.route.snapshot.paramMap.get('exerciseId');

    if (!exerciseId) {
      return;
    }

    this.isLoading.set(true);

    try {
      this.exercise.set(await this.exerciseService.getExerciseById(Number(exerciseId)));
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Erro ao carregar o exercício.',
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  close(): void {
    this.nav.back('/admin/exercicios');
  }
}
