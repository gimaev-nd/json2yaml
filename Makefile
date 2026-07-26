# Бекенд по умолчанию; можно переопределить: make run BACKEND=litestar
BACKEND ?= litestar

.PHONY: install run lint

install: ## Установить зависимости
	uv sync

run: ## Запустить dev-сервер бекенда $(BACKEND)
	cd src/backends/$(BACKEND) && uv run uvicorn app:app --reload

lint: ## Проверить разметку index.html
	uv run djlint src/static/site --check
