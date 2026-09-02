#!/bin/bash
set -e

if [[ -z "$EC2_INSTANCE_ID" ]] || [[ -z "$APP_AWS_REGION" ]] || [[ -z "$DB_USER" ]] || [[ -z "$DB_PASSWORD" ]]; then
    echo "Error: Missing required environment variables: EC2_INSTANCE_ID, APP_AWS_REGION, DB_USER, DB_PASSWORD" >&2
    exit 1
fi

DB_NAME="healthify"
SCHEMA_NAME="healthify"

commands=$(cat << EOF
[
    "docker ps -a --format '{{.Names}}' | grep -q '^healthify-postgres-dev$' || (docker volume create healthify-postgres-data 2>/dev/null || true && docker network create healthify-network 2>/dev/null || true && docker run -d --restart unless-stopped --network healthify-network --name healthify-postgres-dev -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -v healthify-postgres-data:/var/lib/postgresql/data postgres:15-alpine && sleep 10)",
    "docker exec healthify-postgres-dev psql -U postgres -c \"CREATE DATABASE ${DB_NAME};\" 2>/dev/null || true",
    "docker exec healthify-postgres-dev psql -U postgres -c \"CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\" 2>/dev/null || docker exec healthify-postgres-dev psql -U postgres -c \"ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';\" 2>/dev/null || true",
    "docker exec healthify-postgres-dev psql -U postgres -d ${DB_NAME} -c \"CREATE SCHEMA IF NOT EXISTS ${SCHEMA_NAME};\"",
    "docker exec healthify-postgres-dev psql -U postgres -d ${DB_NAME} -c \"GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};\"",
    "docker exec healthify-postgres-dev psql -U postgres -d ${DB_NAME} -c \"GRANT ALL ON SCHEMA ${SCHEMA_NAME} TO ${DB_USER};\"",
    "docker exec healthify-postgres-dev psql -U postgres -d ${DB_NAME} -c \"ALTER SCHEMA ${SCHEMA_NAME} OWNER TO ${DB_USER};\""
]
EOF
)

command_id=$(aws ssm send-command \
    --instance-ids "$EC2_INSTANCE_ID" \
    --document-name "AWS-RunShellScript" \
    --parameters "commands=$commands" \
    --output text \
    --query 'Command.CommandId' 2>/dev/null)

if [[ -z "$command_id" ]]; then
    echo "Error: Failed to send SSM command" >&2
    exit 1
fi

aws ssm wait command-executed --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" 2>/dev/null || true

status=$(aws ssm get-command-invocation \
    --command-id "$command_id" \
    --instance-id "$EC2_INSTANCE_ID" \
    --query 'Status' \
    --output text 2>/dev/null)

if [[ "$status" != "Success" ]]; then
    error_output=$(aws ssm get-command-invocation \
        --command-id "$command_id" \
        --instance-id "$EC2_INSTANCE_ID" \
        --query 'StandardErrorContent' \
        --output text 2>/dev/null)
    echo "Error: Deployment failed with status: $status" >&2
    if [[ "$error_output" != "None" && "$error_output" != "" ]]; then
        echo "$error_output" >&2
    fi
    exit 1
fi
