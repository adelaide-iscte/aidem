import { Component, inject } from '@angular/core';
import { ContentsComponent } from '../features/contents/contents.component';
import { AppNavigationService } from '../core/services/app-navigation.service';

@Component({
  selector: 'app-contents-page',
  standalone: true,
  imports: [ContentsComponent],
  template: `<app-contents (goBack)="nav.back()"></app-contents>`
})
export class ContentsPage {
  readonly nav = inject(AppNavigationService);
}
