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

### Adding new model to system

1. Add the file ine `src/models`
2. include the file in `src/models/index.js`
3. Run `npm run db:sync`
4. Run `npm run db:seed` if any default data needed (Insert if the table empty only)
