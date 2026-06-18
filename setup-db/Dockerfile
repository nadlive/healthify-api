FROM alpine:latest

# Install required tools
RUN apk add --no-cache \
    aws-cli \
    docker-cli \
    postgresql-client \
    bash \
    curl \
    jq

# Create working directory
WORKDIR /app

# Copy scripts
COPY scripts/ ./scripts/

# Make scripts executable
RUN chmod +x ./scripts/*.sh

# Set default command
CMD ["./scripts/deploy-postgres.sh"]
