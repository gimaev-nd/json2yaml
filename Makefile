# Бекенд по умолчанию; можно переопределить: make run BACKEND=litestar
BACKEND ?= litestar

# Порт для тестового прогона (не совпадает с dev-портом 8000)
TEST_PORT ?= 8010

.PHONY: install run lint test

install: ## Установить зависимости
	uv sync

run: ## Запустить dev-сервер бекенда $(BACKEND)
	cd src/backends/$(BACKEND) && uv run uvicorn app:app --reload

lint: ## Проверить разметку index.html
	uv run djlint src/static/site --check

test: ## Прогнать hurl-тесты: поднять бекенд litestar на порту $(TEST_PORT) и остановить после
	@set -e; \
	echo "== Поднимаю бекенд litestar на порту $(TEST_PORT)"; \
	(cd src/backends/litestar && exec uv run uvicorn app:app --port $(TEST_PORT)) > /tmp/json2yaml-test-server.log 2>&1 & \
	PID=$$!; \
	trap 'kill $$PID 2>/dev/null || true' EXIT; \
	for i in $$(seq 1 50); do \
		curl -sf "http://127.0.0.1:$(TEST_PORT)/" -o /dev/null && break; \
		sleep 0.2; \
	done; \
	echo "== Прогоняю hurl-тесты"; \
	hurl --test --variable host=127.0.0.1:$(TEST_PORT) tests/hurls/*.hurl
