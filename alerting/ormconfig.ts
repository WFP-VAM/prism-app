import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { join } from 'path';
import { ConnectionOptions } from 'typeorm';

// dotenv is a dev dependency, so conditionally import it (don't need it in Prod).
try {
  // eslint-disable-next-line import/no-extraneous-dependencies, global-require
  require('dotenv').config();
} catch {
  // Pass
}

const env = process.env.NODE_ENV || 'development';

// If we have a DATABASE_URL, use that
const connectionInfo = process.env.DATABASE_URL
  ? { url: process.env.DATABASE_URL }
  : {
      host: process.env.POSTGRES_HOST || 'localhost',
      port:
        (process.env.POSTGRES_PORT &&
          parseInt(process.env.POSTGRES_PORT, 10)) ||
        5432,
      database: process.env.POSTGRES_DATABASE || 'postgres',
      ...(process.env.POSTGRES_USER && { username: process.env.POSTGRES_USER }),
      ...(process.env.POSTGRES_PASSWORD && {
        password: process.env.POSTGRES_PASSWORD,
      }),
    };

// Unfortunately, we need to use CommonJS/AMD style exports rather than ES6-style modules for this due to how
// TypeORM expects the config to be available. Typescript doesn't like this- hence the @ts-ignore.
// @ts-ignore
export = ({
  type: 'postgres',
  ...connectionInfo,
  // We don't want to auto-synchronize production data - we should deliberately run migrations.
  synchronize: false,
  logging: false,
  namingStrategy: new SnakeNamingStrategy(),
  entities: [
    // Needed to get a TS context on entity imports.
    // See
    // https://stackoverflow.com/questions/59435293/typeorm-entity-in-nestjs-cannot-use-import-statement-outside-a-module
    join(__dirname, 'src/**', '*.entity.ts'),
    join(__dirname, 'src/**', '*.entity.js'),
  ],
  seeds: [join(__dirname, 'src/seeds', '*.seeds.ts')],
  factories: [join(__dirname, 'src/seeds', '*.factory.ts')],
  migrations: [join(__dirname, 'migration/**', '*.ts')],
  subscribers: [join(__dirname, 'subscriber/**', '*.ts')],
  cli: {
    migrationsDir: 'migration',
    subscribersDir: 'subscriber',
  },
} as unknown) as ConnectionOptions;
