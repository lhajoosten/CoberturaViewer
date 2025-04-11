import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoverageInsightsComponent } from './coverage-insights.component';

describe('CoverageInsightsComponent', () => {
  let component: CoverageInsightsComponent;
  let fixture: ComponentFixture<CoverageInsightsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverageInsightsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoverageInsightsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
