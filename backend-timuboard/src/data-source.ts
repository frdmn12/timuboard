import 'dotenv/config';
import { DataSource } from 'typeorm';

/** Hanya untuk CLI migrasi (npm run migration:*). Aplikasi memakai konfigurasi di app.module.ts. */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
