import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MouvementFormComponent } from './mouvement-form.component';

describe('MouvementFormComponent', () => {
  let component: MouvementFormComponent;
  let fixture: ComponentFixture<MouvementFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MouvementFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MouvementFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
