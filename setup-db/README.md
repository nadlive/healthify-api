# Healthify Database Setup

A Docker-based PostgreSQL deployment and schema management tool for the Healthify microservices architecture.

## 🏗️ Structure

```
setup-db/
├── Dockerfile              # Alpine-based container with AWS CLI, Docker, and PostgreSQL client
├── scripts/
│   └── deploy-postgres.sh   # Main deployment script with error handling and logging
├── sql/
│   └── create-schemas.sql   # Schema creation and permission setup
└── README.md               # This file
```

## 🚀 Usage

### Local Testing

```bash
# Build the container
docker build -t healthify-db-setup ./setup-db

# Run deployment (requires AWS credentials and EC2 access)
docker run --rm \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e APP_AWS_REGION=us-east-1 \
  -e EC2_INSTANCE_ID=i-07fedbcbfd873632b \
  -e EC2_DNS=3.233.45.193 \
  -e ACTION=deploy \
  healthify-db-setup
```

### GitHub Actions Integration

```yaml
- name: Deploy PostgreSQL with Schemas
  run: |
    docker build -t healthify-db-setup ./setup-db
    docker run --rm \
      -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
      -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
      -e APP_AWS_REGION=$APP_AWS_REGION \
      -e EC2_INSTANCE_ID=$EC2_INSTANCE_ID \
      -e EC2_DNS=$EC2_DNS \
      -e ACTION=deploy \
      healthify-db-setup
```

## 🎯 Actions

- **`deploy`** (default): Deploy PostgreSQL and create all schemas
- **`restart`**: Restart existing PostgreSQL container
- **`stop`**: Stop PostgreSQL container

## 📊 Database & Schema

The deployment creates:

- Database: `healthify_db_v1`
- Schema: `healthify`

## 🔧 Environment Variables

### Required

- `EC2_INSTANCE_ID` - Target EC2 instance ID
- `APP_AWS_REGION` - AWS region

### Optional

- `EC2_DNS` - EC2 DNS name (for connection info display)
- `ACTION` - Action to perform (deploy/restart/stop, default: deploy)

### AWS Credentials

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- Or use IAM roles/OIDC in GitHub Actions

## ✅ Benefits

- **Clean separation**: No more embedded shell scripts in YAML
- **Testable**: Run locally with `docker run`
- **Maintainable**: Proper shell scripts with error handling
- **Reusable**: Same container for all database operations
- **Version controlled**: Scripts tracked in Git
- **Colored output**: Easy to read logs with status indicators

## 🔍 Logging

The script provides colored output for different log levels:

- 🔵 **Info**: General information
- ✅ **Success**: Successful operations
- ⚠️ **Warning**: Non-critical issues
- ❌ **Error**: Critical failures

## 🎉 Migration from YAML

This replaces the complex embedded shell scripts in `.github/workflows/deploy-postgres.yml`, reducing it from 235+ lines to a simple Docker run command.
