const databaseUrl = process.env.MONGO_DB_URL || process.env.MONOG_DB_URL;

if (!databaseUrl) {
  throw new Error('MONGO_DB_URL is required in the environment.');
}

const port = Number(process.env.PORT) || 5000;

export default {
  databaseUrl,
  port,
};
