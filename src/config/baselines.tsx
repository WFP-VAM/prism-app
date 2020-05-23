import nsoDisabled from '../data/nso/NSO_Disabled_Admin1_Total.json';
import nsoHerders from '../data/nso/NSO_Herder_HHs_Admin2.json';
import nsoHerdsize from '../data/nso/NSO_Herd_Size_Admin1_LT_200.json';
import nsoChild from '../data/nso/NSO_Child_U5_Admin2.json';
import nsoLivestock from '../data/nso/NSO_Livestock_Count_ths_Admin2.json';
import nsoHayHarvest from '../data/nso/NSO_Hay_Harvest_Admin2.json';
import nsoElderly from '../data/nso/NSO_Single_Elderly_Admin1_Total.json';
import nsoPoverty from '../data/nso/NSO_Poverty_Headcount_Admin1.json';
import mvamCash from '../data/nso/mVAM_Cash_Reserves.json';
import mvamFodder from '../data/nso/mVAM_Fodder_Reserves.json';
import mvamHayprices from '../data/nso/mVAM_Hay_Price.json';
import mvamHayreserves from '../data/nso/mVAM_Hay_Reserves.json';
import nsoPop from '../data/nso/NSO_Population_Admin2_Total.json';

export interface NsoData {
  TBL_ID: string;
  Period: string;
  CODE?: string;
  SCR_MN: string;
  SCR_ENG: string;
  CODE1?: string;
  CODE2?: string | null;
  SCR_MN1: string;
  SCR_ENG1: string;
  SCR_MN2?: string | null;
  SCR_ENG2?: string | null;
  DTVAL_CO: string;
}

export interface NsoDataset {
  DataList: NsoData[];
}

const nsoDatasets = {
  nsoDisabled,
  nsoHerders,
  nsoHerdsize,
  nsoChild,
  nsoLivestock,
  nsoHayHarvest,
  nsoElderly,
  nsoPoverty,
  mvamCash,
  mvamFodder,
  mvamHayprices,
  mvamHayreserves,
  nsoPop,
};

type DatasetKeys = keyof typeof nsoDatasets;

export function getNSOData(dataset?: string) {
  if (dataset && dataset in nsoDatasets) {
    return nsoDatasets[dataset as DatasetKeys] as NsoDataset;
  }
  return nsoPoverty;
}
