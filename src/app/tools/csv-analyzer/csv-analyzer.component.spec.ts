import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsvAnalyzerComponent } from './csv-analyzer.component';

describe('CsvAnalyzerComponent', () => {
  let component: CsvAnalyzerComponent;
  let fixture: ComponentFixture<CsvAnalyzerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsvAnalyzerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CsvAnalyzerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
