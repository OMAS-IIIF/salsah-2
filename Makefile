# Release workflow mirrors FasnachtsPage. docker-build publishes both platforms.
VERSION ?= v$(shell node -p "require('./package.json').version")
IMAGE ?= lrosenth/salsah-2
PLATFORMS ?= linux/amd64,linux/arm64
.PHONY: show-version run docker-build docker-build-local docker-push docker-run
show-version:
	@echo "VERSION=$(VERSION)"
run:
	npm run dev
docker-build:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE):$(VERSION) --push .
docker-build-local:
	docker build -t $(IMAGE):$(VERSION) .
docker-push:
	docker push $(IMAGE):$(VERSION)
docker-run:
	docker run --rm -p 3200:3200 \
		-e ORIGIN=http://localhost:3200 \
		-e PUBLIC_API_URL=http://localhost:8000 \
		-e PUBLIC_MEDIA_URL=http://localhost:8088 $(IMAGE):$(VERSION)
