import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'classNameOnly',
    standalone: true
})
export class ClassNameOnlyPipe implements PipeTransform {
    transform(value: string): string {
        return value.split('.').pop() || value;
    }
}