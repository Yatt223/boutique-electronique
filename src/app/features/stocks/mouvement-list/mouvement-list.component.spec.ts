import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MouvementListComponent } from './mouvement-list.component';

describe('MouvementListComponent', () => {
  let component: MouvementListComponent;
  let fixture: ComponentFixture<MouvementListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MouvementListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MouvementListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
