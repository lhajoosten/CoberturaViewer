import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

export const fadeInOut = trigger('fadeInOut', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in', style({ opacity: 1 }))
    ]),
    transition(':leave', [
        animate('300ms ease-out', style({ opacity: 0 }))
    ])
]);

export const slideInOut = trigger('slideInOut', [
    transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateY(20px)', opacity: 0 }))
    ])
]);

export const slideRightLeft = trigger('slideRightLeft', [
    transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
    ]),
    transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(-100%)', opacity: 0 }))
    ])
]);

export const expandCollapse = trigger('expandCollapse', [
    transition(':enter', [
        style({ height: '0', overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*' }))
    ]),
    transition(':leave', [
        style({ height: '*', overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: '0' }))
    ])
]);

export const listAnimation = trigger('listAnimation', [
    transition('* => *', [
        query(':enter', [
            style({ transform: 'translateY(20px)', opacity: 0 }),
            stagger(100, [
                animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
            ])
        ], { optional: true }),
        query(':leave', [
            stagger(100, [
                animate('300ms ease-in', style({ transform: 'translateY(20px)', opacity: 0 }))
            ])
        ], { optional: true })
    ])
]);

export const routeAnimation = trigger('routeAnimation', [
    transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
            style({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%'
            })
        ], { optional: true }),
        query(':enter', [
            style({ opacity: 0 })
        ], { optional: true }),
        query(':leave', [
            animate('300ms ease-out', style({ opacity: 0 }))
        ], { optional: true }),
        query(':enter', [
            animate('300ms ease-in', style({ opacity: 1 }))
        ], { optional: true })
    ])
]);