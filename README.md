### Allow insecure content in Chrome

The free AWS setup only serves the apps over HTTP. Chrome blocks camera, microphone, and other mixed content on these sites until insecure content is allowed.

1. Open the app URL in Chrome.
2. Click the Lock / Caution icon on the far left of the address bar.
3. Click **Site settings**.
4. Scroll down until you find **Insecure content**.
5. Set it to **Allow**, then reload the page.

### Ask the team

for value in .env. Values in .env.example probably would work

### Notes

Dev deployment env variables can be found

- Top of the deploy-api.yml
- Github secrets
- AWS parameter store

### Get Bearer token for google health API

```
gcloud auth print-access-token
```

### base64 encoded variable need for pipeline for dev

`GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` need to be encoded using `GOOGLE_APPLICATION_CREDENTIALS_JSON`

`echo -n '{"type":............"}' | base64
`

### Connect to the database with DBeaver

Postgres runs on the `healthify-v3-ec2` instance (`i-029a71ca5deab95ff`). Port 5432 is not open on the internet. Start a tunnel and leave it running. This needs the Session Manager plugin.

```bash
aws ssm start-session \
  --profile default \
  --region us-east-1 \
  --target i-029a71ca5deab95ff \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["5432"]}'
```

If port 5432 is already in use on your machine, set `localPortNumber` to `5433` and use that port in DBeaver.

Create a PostgreSQL connection in DBeaver:

| Field | Value |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `healthify` |
| Username | `postgres` |
| Password | SSM parameter `/api/DB_PASSWORD` |

```bash
aws ssm get-parameter --profile default --region us-east-1 \
  --name /api/DB_PASSWORD --with-decryption --query Parameter.Value --output text
```

Test the connection while the tunnel terminal is still open. Closing that terminal closes the database connection.

### Adding new model to system

1. Add the file ine `src/models`
2. include the file in `src/models/index.js`
3. Run `npm run db:sync`
4. Run `npm run db:seed` if any default data needed (Insert if the table empty only)
