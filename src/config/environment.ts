const getEnvVariable = (key: string, fallback: string) => {
  const value = process.env[key];
  return value?.trim() ? value : fallback;
};

export const env = {
  NODE_ENV: getEnvVariable("NODE_ENV", "development"),
  NEXT_PUBLIC_APP_URL: getEnvVariable("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: getEnvVariable("NEXT_PUBLIC_APP_NAME", "CS Ufe Studio"),
  DATABASE_URL: getEnvVariable(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/cs_ufe",
  ),
  accessTokenSecret: getEnvVariable("ACCESS_TOKEN_SECRET", "cs-ufe-local-access"),
  refreshTokenSecret: getEnvVariable("REFRESH_TOKEN_SECRET", "cs-ufe-local-refresh"),
};

export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
