// import { Injectable } from '@angular/core';
// import { Subject, Observable } from 'rxjs';

// @Injectable({
//     providedIn: 'root'
// })
// export class GoogleChartService {
//     private isLoaded = false;
//     private googleLoaded = new Subject<boolean>();

//     constructor() {
//         this.loadGoogleCharts();
//     }

//     /**
//      * Loads the Google Charts library
//      */
//     private loadGoogleCharts(): void {
//         if (this.isLoaded) {
//             this.googleLoaded.next(true);
//             return;
//         }

//         const script = document.createElement('script');
//         script.type = 'text/javascript';
//         script.src = 'https://www.gstatic.com/charts/loader.js';
//         script.async = true;
//         script.defer = true;

//         script.onload = () => {
//             if (google) {
//                 google.charts.load('current', {
//                     packages: ['corechart', 'treemap', 'table', 'sankey']
//                 });

//                 google.charts.setOnLoadCallback(() => {
//                     this.isLoaded = true;
//                     this.googleLoaded.next(true);
//                 });
//             }
//         };

//         document.head.appendChild(script);
//     }

//     /**
//      * Returns an observable that emits when Google Charts is loaded
//      */
//     getGoogle(): Observable<boolean> {
//         if (this.isLoaded) {
//             this.googleLoaded.next(true);
//         }
//         return this.googleLoaded.asObservable();
//     }

//     /**
//      * Creates a TreeMap chart
//      */
//     createTreeMap(element: HTMLElement, data: any[][], options: any): any {
//         const chart = new google.visualization.TreeMap(element);
//         const dataTable = google.visualization.arrayToDataTable(data);
//         chart.draw(dataTable, options);
//         return chart;
//     }

//     /**
//      * Creates a PieChart
//      */
//     createPieChart(element: HTMLElement, data: any[][], options: any): any {
//         const chart = new google.visualization.PieChart(element);
//         const dataTable = google.visualization.arrayToDataTable(data);
//         chart.draw(dataTable, options);
//         return chart;
//     }

//     /**
//      * Creates a Table
//      */
//     createTable(element: HTMLElement, data: any[][], options: any): any {
//         const chart = new google.visualization.Table(element);
//         const dataTable = google.visualization.arrayToDataTable(data);
//         chart.draw(dataTable, options);
//         return chart;
//     }

//     /**
//      * Updates a chart with new data
//      */
//     updateChart(chart: any, data: any[][], options: any): void {
//         const dataTable = google.visualization.arrayToDataTable(data);
//         chart.draw(dataTable, options);
//     }
// }