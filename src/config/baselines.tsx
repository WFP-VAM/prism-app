import nsoDisabled from '../data/nso/number_of_disabled_persons.json';
import nsoHerd from '../data/nso/NSO_Herd_Size_Admin1_LT_200.json';
// import nsoA from '../../../data/nso/number_of_disabled_persons.json';
// import nsoB from '../../../data/nso/number_of_disabled_persons.json';
// import nsoD from '../../../data/nso/number_of_disabled_persons.json';

const nsoDatasets = {
  nsoDisabled,
  nsoHerd,
  // nsoPoverty: nsoPoverty,
  // nsoA: nsoA,
  // nsoB: nsoB,
  // nsoD: nsoD,
};

type DatasetKeys = 'nsoDisabled' | 'nsoDisabled' | 'nsoHerd';

export function getNSOData(dataset: string | undefined) {
  if (dataset && dataset in nsoDatasets) {
    return nsoDatasets[dataset as DatasetKeys];
  }
  return nsoDisabled;
}
