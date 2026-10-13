import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VenteListComponent } from './vente-list.component';

describe('VenteListComponent', () => {
  let component: VenteListComponent;
  let fixture: ComponentFixture<VenteListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenteListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VenteListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
