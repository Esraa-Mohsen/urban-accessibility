import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuggestionPanel } from './suggestion-panel';

describe('SuggestionPanel', () => {
  let component: SuggestionPanel;
  let fixture: ComponentFixture<SuggestionPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuggestionPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuggestionPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
