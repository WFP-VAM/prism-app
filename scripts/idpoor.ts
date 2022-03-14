import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { get } from 'lodash';

const ROOT_DIR = path.dirname(__dirname);
const BASE_API_URI = 'https://mop.idpoor.gov.kh/api/analytics/public/units';

async function fetchIdPoorData() {
  const defaultParams = 'region=ALL&isOnDemand=ALL&year=ALL&round=ALL';
  const countryUri = `${BASE_API_URI}/KH/children?${defaultParams}`;

  const country = await (await axios.get(countryUri)).data;

  return country.map(async (p: object) => {
    const provinceId = get(p, 'uuid');
    const provinceUri = `${BASE_API_URI}/${provinceId}/children?${defaultParams}`;

    const province = await (await axios.get(provinceUri)).data;
    return province.map(async (d: object) => {
      const districtId = get(d, 'uuid');
      const districtUri = `${BASE_API_URI}/${districtId}/children?${defaultParams}`;

      const district = await (await axios.get(districtUri)).data;
      return district.map(async (c: object) => {
        // const communeId = get(c, 'uuid');
        // const communeUri = `${BASE_API_URI}/${communeId}/children?${defaultParams}`;

        // const commune = await (await axios.get(communeUri)).data;
        console.warn('-> ', c);
      });
    });
  });
}

async function updateIdPoorConfig(country: string): Promise<void> {
  const dataDir = path.join(ROOT_DIR, `public/data/${country}`);
  const file = path.join(dataDir, 'idpoor.json');

  switch (country) {
    case 'cambodia':
      fs.access(
        file,
        fs.constants.F_OK,
        async (fileMissingError: Error | null) => {
          if (!fileMissingError) {
            console.warn('- Loading...');
            fetchIdPoorData()
              .then(data => {
                console.warn(data.length);
                console.warn('- done.');
              })
              .catch(error => {
                console.warn(error);
              });
            // writing to a file
            // find out how instead it can generate a pr
            // using typescript
            // fs.writeFile(
            //   path.join(dataDir, 'idpoor.json'),
            //   JSON.stringify(data),
            //   (fileWriteError: any) => {
            //     if (fileWriteError) {
            //       throw fileWriteError;
            //     }
            //   },
            // );
          }
        },
      );
      break;
    default:
      console.warn(`No prebuild for ID Poor in ${country}`);
      break;
  }
}

((): void => {
  const COUNTRY: string = process.env.REACT_APP_COUNTRY as string;
  updateIdPoorConfig(COUNTRY);
})();
