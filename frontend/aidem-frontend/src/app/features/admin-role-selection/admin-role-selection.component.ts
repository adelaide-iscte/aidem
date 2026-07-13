import {
  Component,
  EventEmitter,
  Output
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type AdminViewMode = 'formal' | 'informal';

@Component({
  selector: 'app-admin-role-selection',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-role-selection.component.html',
  styleUrl: './admin-role-selection.component.scss'
})
export class AdminRoleSelectionComponent {
  @Output()
  selectMode = new EventEmitter<AdminViewMode>();

  selectFormal(): void {
    this.selectMode.emit('formal');
  }

  selectInformal(): void {
    this.selectMode.emit('informal');
  }
}
