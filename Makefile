GCLOUD_BIN ?= $(if $(wildcard $(HOME)/Downloads/google-cloud-sdk/bin/gcloud),$(HOME)/Downloads/google-cloud-sdk/bin/gcloud,gcloud)
PROJECT_ID ?= $(shell $(GCLOUD_BIN) config get-value project 2>/dev/null)
REGION ?= us-west1
SERVICE_NAME ?= yduck-api
LOCAL_API_BASE_URL ?= http://localhost:8080
CLOUD_API_BASE_URL ?= $(shell $(GCLOUD_BIN) run services describe $(SERVICE_NAME) --project $(PROJECT_ID) --region $(REGION) --format 'value(status.url)' 2>/dev/null)

.PHONY: dev-local dev-cloud cloud-url

dev-local:
	NEXT_PUBLIC_API_BASE_URL=$(LOCAL_API_BASE_URL) npm run dev

dev-cloud:
	@if [ -z "$(CLOUD_API_BASE_URL)" ]; then \
		echo "Could not resolve Cloud Run URL."; \
		echo "Pass it explicitly:"; \
		echo "  CLOUD_API_BASE_URL=https://SERVICE_URL make dev-cloud"; \
		echo ""; \
		echo "Or set PROJECT_ID, REGION, and SERVICE_NAME:"; \
		echo "  PROJECT_ID=PROJECT_ID REGION=us-west1 SERVICE_NAME=yduck-api make dev-cloud"; \
		exit 2; \
	fi
	NEXT_PUBLIC_API_BASE_URL=$(CLOUD_API_BASE_URL) npm run dev

cloud-url:
	@if [ -z "$(CLOUD_API_BASE_URL)" ]; then \
		echo "Could not resolve Cloud Run URL."; \
		exit 2; \
	fi
	@echo "$(CLOUD_API_BASE_URL)"
