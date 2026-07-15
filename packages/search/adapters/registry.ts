import type { CourtType } from '../types.js';
import type { SearchAdapter } from './types.js';
import { DistrictSearchAdapter } from './district.js';
import { AppealSearchAdapter } from './appeal.js';
import { CassationSearchAdapter } from './cassation.js';
import { MagistrateSearchAdapter } from './magistrate.js';

const adapters: Partial<Record<CourtType, SearchAdapter>> = {
  district: new DistrictSearchAdapter(),
  appeal: new AppealSearchAdapter(),
  cassation: new CassationSearchAdapter(),
  magistrate: new MagistrateSearchAdapter(),
};

export function getSearchAdapter(courtType: CourtType): SearchAdapter {
  const a = adapters[courtType];
  if (!a) throw new Error(`Нет адаптера для типа суда: ${courtType}`);
  return a;
}
