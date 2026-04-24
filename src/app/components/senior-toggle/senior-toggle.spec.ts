import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeniorToggle } from './senior-toggle';

describe('SeniorToggle', () => {
  let component: SeniorToggle;
  let fixture: ComponentFixture<SeniorToggle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeniorToggle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeniorToggle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
