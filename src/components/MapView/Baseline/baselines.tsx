import nsoDisabled from '../../../data/nso/number_of_disabled_persons.json';
// import nsoPoverty from '../../../data/nso/number_of_disabled_persons.json';
// import nsoA from '../../../data/nso/number_of_disabled_persons.json';
// import nsoB from '../../../data/nso/number_of_disabled_persons.json';
// import nsoD from '../../../data/nso/number_of_disabled_persons.json';

const nsoDatasets = {
  nsoDisabled,
  // nsoPoverty: nsoPoverty,
  // nsoA: nsoA,
  // nsoB: nsoB,
  // nsoD: nsoD,
};

export function getNSOData(dataset: string) {
  if (dataset in nsoDatasets) {
    return nsoDatasets[dataset];
  }
  return {};
}
