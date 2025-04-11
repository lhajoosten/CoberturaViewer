import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoverageTrendsComponent } from './coverage-trends.component';

describe('CoverageTrendsComponent', () => {
  let component: CoverageTrendsComponent;
  let fixture: ComponentFixture<CoverageTrendsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoverageTrendsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CoverageTrendsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
