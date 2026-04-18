import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

import {Student} from '../../models';

@Component({
  selector: 'app-student-card',
  templateUrl: './student-card.component.html',
  styleUrls: ['./student-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentCardComponent {
  @Input({required: true}) student!: Student;

  get initials(): string {
    const parts = this.student.name.trim().split(/\s+/).filter(Boolean);
    const first = parts.at(0)?.[0] ?? '';
    const last = parts.length > 1 ? parts.at(-1)?.[0] ?? '' : '';
    return (first + last).toUpperCase();
  }

  trackSkill = (_: number, item: Student['skills'][number]) => item.skillName;
}

