.DEFAULT_GOAL := help

.PHONY: help install build clean lint lint-fix test test-watch test-coverage check dev link \
        version-patch version-minor version-major publish changelog

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Dependencies ──────────────────────────────────────────────────────────────

install: ## Install npm dependencies
	npm install

# ── Build ─────────────────────────────────────────────────────────────────────

build: ## Compile TypeScript → dist/
	npm run build

clean: ## Remove dist/
	npm run clean

dev: ## Watch mode (recompile on change)
	npx tsc --watch

# ── Quality ───────────────────────────────────────────────────────────────────

lint: ## Run ESLint
	npx eslint src/ --ext .ts

lint-fix: ## Run ESLint with auto-fix
	npx eslint src/ --ext .ts --fix

test: ## Run tests once
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-coverage: ## Run tests with coverage report
	npm run test:coverage

check: lint test build ## Full pre-publish gate: lint + test + build

# ── Local dev with Homebridge ─────────────────────────────────────────────────

link: build ## npm link for testing inside a local Homebridge instance
	npm link

unlink: ## Remove npm link
	npm unlink

# ── Versioning ────────────────────────────────────────────────────────────────

version-patch: ## Bump patch version (x.y.Z) and create git tag
	npm version patch

version-minor: ## Bump minor version (x.Y.0) and create git tag
	npm version minor

version-major: ## Bump major version (X.0.0) and create git tag
	npm version major

changelog: ## Show commits since last git tag
	@git log --oneline \
		$$(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD)..HEAD

# ── Release ───────────────────────────────────────────────────────────────────

publish: check ## Run full check then publish to npm
	npm publish
