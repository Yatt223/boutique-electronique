import { TestBed } from '@angular/core/testing';

import { MouvementCaisseService } from './mouvement-caisse.service';

describe('MouvementCaisseService', () => {
  let service: MouvementCaisseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MouvementCaisseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
