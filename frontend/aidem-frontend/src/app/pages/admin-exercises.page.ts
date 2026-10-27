import { Component, inject } from '@angular/core';
import { AdminExercisesComponent } from '../features/admin-exercises/admin-exercises.component';
import { Exercise } from '../core/services/exercise.service';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-admin-exercises-page',
  standalone: true,
  imports: [AdminExercisesComponent],
  template: `
    <app-admin-exercises
      [isAdmin]="true"
      (goBack)="nav.back()"
      (createExercise)="nav.openCreateExercise()"
      (editExercise)="onEditExercise($event)">
    </app-admin-exercises>
  `
})
export class AdminExercisesPage {
  readonly nav = inject(AppNavigationService);

  onEditExercise(exercise: Exercise): void {
    this.nav.openEditExercise(exercise.id);
  }
}
