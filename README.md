## Deployment

This project is set up to deploy the API on Railway and the database on Neon.

### Required environment variables

Set these on Railway:

- `NODE_ENV=production`
- `PORT` is injected by Railway automatically
- `DATABASE_URL` from Neon
- `FRONTEND_URL=https://app-frontend-git-dev-ahmed-abdulrahman-fathys-projects.vercel.app`
- `JWT_ACCESS_TOKEN_SECRET`
- `JWT_REFRESH_TOKEN_SECRET`
- `RESEND_API_KEY`
- `MAIL_FROM`

Optional, if you want explicit throttling overrides:

- `THROTTLER_GLOBAL_TTL`
- `THROTTLER_GLOBAL_LIMIT`
- `THROTTLER_LOGIN_TTL`
- `THROTTLER_LOGIN_LIMIT`
- `THROTTLER_SIGNUP_TTL`
- `THROTTLER_SIGNUP_LIMIT`
- `THROTTLER_FORGET_PASSWORD_TTL`
- `THROTTLER_FORGET_PASSWORD_LIMIT`
- `THROTTLER_REFRESH_TTL`
- `THROTTLER_REFRESH_LIMIT`

### Railway setup

1. Create a Neon database and copy the connection string.
2. Create a new Railway project and connect this GitHub repository.
3. Add a Node.js service for the API.
4. Set the build command to `npm run build`.
5. Set the start command to `npm run start:prod`.
6. Add the environment variables above, especially `DATABASE_URL` and the JWT secrets.
7. Add a Railway deploy command or release step that runs `npm run migration:run` before the app starts.
8. Deploy the service.

### Deployment flow

1. Railway builds the app with Nest.
2. The migration command connects to Neon through `DATABASE_URL`.
3. The app starts with production cookies, CORS, and proxy settings enabled.
4. The API should be available under Railway's public domain with the `/api` prefix.

### Notes

- The app uses cookie-based auth, so `FRONTEND_URL` must match the deployed frontend origin exactly and should not end with `/`.
- Neon requires SSL; the app now enables that automatically when `DATABASE_URL` is set.
- The production build uses runtime alias resolution, so no import rewrites are needed during deploy.
