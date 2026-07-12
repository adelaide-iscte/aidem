import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

type ContentType = 'books' | 'movies' | 'theater' | null;

@Component({
  selector: 'app-contents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './contents.component.html',
  styleUrl: './contents.component.scss'
})
export class ContentsComponent {
  @Output() goBack = new EventEmitter<void>();

  selectedType: ContentType = null;

  select(type: ContentType): void {
    this.selectedType = type;
  }
}
