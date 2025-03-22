import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassInfo } from '../../models/coverage.model';

@Component({
    selector: 'app-class-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './class-details.component.html',
    styleUrls: ['./class-details.component.scss']
})
export class ClassDetailsComponent implements OnInit {
    @Input() classInfo!: ClassInfo;

    constructor() { }

    ngOnInit(): void {
    }

    getHitsClass(hits: number): string {
        return hits > 0 ? 'covered' : 'uncovered';
    }
}