# Ошибка парсинга JSON → 422, тело — описание ошибки в формате YAML.
# Точный текст сообщения зависит от реализации бекенда, проверяем только код.
POST http://{{host}}/api/json-to-yaml
Content-Type: application/json
{
  "text": "{\"сломано\": "
}

HTTP 422
