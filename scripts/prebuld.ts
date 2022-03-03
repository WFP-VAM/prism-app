import * as fs from 'fs';
import * as path from 'path';

const rootDir = path.dirname(__dirname);

function idPoorPrebuild(country: string): void {
  const dataDir = path.join(rootDir, `public/data/${country}`);
  const file = path.join(dataDir, 'idpoor.json');

  switch (country) {
    case 'cambodia':
      console.warn(' Prebuild: ID Poor Cambodia');

      fs.access(file, fs.constants.F_OK, err => {
        if (!err) {
          fs.rename(
            file,
            path.join(dataDir, `idpoor${Date.now()}.json`),
            renameErr => {
              if (renameErr) {
                throw renameErr;
              }
            },
          );
        }
      });

      fs.writeFile(file, '{}', err => {
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
  const COUNTRY = process.env.REACT_APP_COUNTRY;
  idPoorPrebuild(COUNTRY);
  // add prebuild function/processes here
})();
