// backend/src/core/config.js
import 'dotenv/config';
import fs from 'fs';

const base = {
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: false,
  dialectOptions: process.env.DB_SSL === 'true'
    ? {
      ssl: {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
        ca: (process.env.DB_SSL_CA_PATH && fs.existsSync(process.env.DB_SSL_CA_PATH))
          ? fs.readFileSync(process.env.DB_SSL_CA_PATH, 'utf8')
          : undefined
      }
    }
    : {}
};

export const runtimeDbConfig = {
  development: base,
  test: { ...base, database: `${process.env.DB_NAME || 'fedeshub'}_test` },
  production: base
};
