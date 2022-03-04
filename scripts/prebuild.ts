// const fs = require('fs');
// const path = require('path');
import * as fs from 'fs';
import * as path from 'path';

console.warn('Prebuilding...');

const rootDir = path.dirname(__dirname);

function idPoorPrebuild(country: string): void {
  const dataDir = path.join(rootDir, `public/data/${country}`);
  const file = path.join(dataDir, 'idpoor.json');

  switch (country) {
    case 'cambodia':
      console.warn(' Prebuild: ID Poor Cambodia');

      fs.access(file, fs.constants.F_OK, (missingFileError: unknown) => {
        if (!missingFileError) {
          // fetch data from idpoor api
          // const resp = await fetch('http://localhost/idpoor/data', {
          //   mode: 'cors',
          // });

          // console.warn('-> ', resp);
          // once response is Ok
          // rename the current idpoor.json to idpoor-back.json
          // write new idpoor.json file with response
          fs.rename(
            file,
            path.join(dataDir, `idpoor${Date.now()}.json`),
            (err: unknown) => {
              if (err) {
                throw err;
              }
            },
          );
        }
      });

      fs.writeFile(file, '{}', (err: any) => {
        if (err) {
          throw err;
        }
      });
      // call function which process and return json
      // save the json in idpoor.json file
      break;
    default:
      console.warn(`No prebuild for ID Poor in ${country}`);
      break;
  }
}

(function runPrebuild(): void {
  const COUNTRY: string = process.env.REACT_APP_COUNTRY as string;
  idPoorPrebuild(COUNTRY);
  // add prebuild function/processes here
})();

console.warn('Prebuilding done.');
