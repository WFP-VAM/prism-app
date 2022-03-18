import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { get } from 'lodash';

const ROOT_DIR = path.dirname(__dirname);
const BASE_URI = 'https://mop.idpoor.gov.kh/api/analytics/public/units';
const PARAMS = 'region=ALL&isOnDemand=ALL&year=ALL';

const fetchIdPoor = async () => {
  const roundsUri = `${BASE_URI}/KH?${PARAMS}&round=ALL`;
  try {
    // eslint-disable-next-line fp/no-mutating-methods
    const rounds = await (await axios.get(roundsUri)).data.rounds
      .map((r: object) => Number(get(r, 'name')))
      .sort((n: number, nn: number) => n - nn)
      .reduce((acc: number[], n: number) => [n, ...acc], []);

    const all = rounds.map(async (round: number) => {
      const pUri = `${BASE_URI}/KH/children?${PARAMS}&round=${round}`;
      try {
        const provinces = await (await axios.get(pUri)).data;

        const allD = provinces.map(async (d: object) => {
          const dId = get(d, 'uuid');
          const dUri = `${BASE_URI}/${dId}/children?${PARAMS}&round=${round}`;
          try {
            const districts = await (await axios.get(dUri)).data;

            const allC = districts.map(async (c: object) => {
              const cId = get(c, 'uuid');
              const cUri = `${BASE_URI}/${cId}/children?${PARAMS}&round=${round}`;
              try {
                const communes = await (await axios.get(cUri)).data;

                const allStats = communes.map(async (commune: object) => {
                  const communeId = Number(get(commune, 'uuid')).toString();
                  const communeCode = Number(get(commune, 'code')).toString();
                  const sUri = `${BASE_URI}/${communeId}/statistics?${PARAMS}&round=${round}`;
                  const formattedStats = {
                    Adm3_NCDD: communeCode,
                    name: get(commune, 'name'),
                    nameKm: get(commune, 'nameKm'),
                    total: get(commune, 'rural'),
                  };

                  try {
                    const stats = await (await axios.get(sUri)).data;

                    return {
                      ...formattedStats,
                      level1: get(stats[0], 'households'),
                      level2: get(stats[1], 'households'),
                    };
                  } catch {
                    return formattedStats;
                  }
                });

                return Promise.all(allStats);
              } catch {
                return null;
              }
            });

            return Promise.all(allC);
          } catch {
            return null;
          }
        });

        return Promise.all(allD);
      } catch {
        return null;
      }
    });

    return Promise.all(all);
  } catch {
    throw new Error('Failed to get rounds');
  }
};

(async () => {
  const COUNTRY: string = process.env.REACT_APP_COUNTRY as string;

  if (COUNTRY === 'cambodia') {
    const data = await fetchIdPoor();
    const datalist = JSON.stringify({
      DataList: data.flat(3).filter(d => d !== null),
    });
    console.warn(datalist);

    const dataDir = path.join(ROOT_DIR, `public/data/${COUNTRY}`);
    const file = path.join(dataDir, 'idpoor.json');
    fs.writeFile(file, datalist, (fileWriteError: Error | null) => {
      if (fileWriteError) {
        throw fileWriteError;
      }
    });
  } else {
    console.warn(`ID Poor scrip not suppored in ${COUNTRY}`);
  }

  console.warn('- Done');
})();
