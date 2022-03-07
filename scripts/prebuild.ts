import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

console.warn('Prebuilding...');

const rootDir = path.dirname(__dirname);

function idPoorPrebuild(country: string): void {
  const dataDir = path.join(rootDir, `public/data/${country}`);
  const file = path.join(dataDir, 'idpoor.json');

  switch (country) {
    case 'cambodia':
      console.warn('ID Poor Cambodia');

      fs.access(file, fs.constants.F_OK, (fileMissingError: any) => {
        if (!fileMissingError) {
          // fetch data from idpoor api
          axios
            .get('http://localhost/idpoor/data')
            .then(resp => resp.data)
            .then(data => {
              // backup previous data
              fs.rename(
                file,
                path.join(dataDir, `idpoor${Date.now()}.json`),
                (fileRenameError: any) => {
                  if (fileRenameError) {
                    throw fileRenameError;
                  }
                },
              );

              // write new data
              fs.writeFile(
                path.join(dataDir, 'idpoor.json'),
                JSON.stringify(data),
                (fileWriteError: any) => {
                  if (fileWriteError) {
                    throw fileWriteError;
                  }
                },
              );
            })
            .catch(error => {
              console.warn('-> ', error);
            });
        }
      });

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
