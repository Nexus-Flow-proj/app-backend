## Deployment

This project is set up to deploy the API on Render and the database on Neon.

### Required environment variables

Set these on Render:

- `NODE_ENV=production`
- `PORT=10000` or leave Render to assign its own port
- `DATABASE_URL` from Neon
- `FRONTEND_URL` for your deployed frontend
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

### Render setup

1. Create a Neon database and copy the connection string.
2. Create a new Render Web Service from this repository.
3. Set the build command to `npm run build`.
4. Set the start command to `npm run start:prod`.
5. Add the environment variables above, especially `DATABASE_URL` and the JWT secrets.
6. Add the pre-deploy command `npm run migration:run` so the Neon schema is created before each deploy.
7. Deploy the service.

### Deployment flow

1. Render builds the app with Nest.
2. The migration command connects to Neon through `DATABASE_URL`.
3. The app starts with production cookies, CORS, and proxy settings enabled.
4. The API should be available under Render's service URL with the `/api` prefix.

### Notes

- The app uses cookie-based auth, so `FRONTEND_URL` must match the deployed frontend origin.
- Neon requires SSL; the app now enables that automatically when `DATABASE_URL` is set.
- The production build uses runtime alias resolution, so no import rewrites are needed during deploy.
