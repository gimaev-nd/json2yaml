# Ошибка парсинга YAML → 422, тело — описание ошибки в формате YAML.
# Точный текст сообщения зависит от реализации бекенда, проверяем только код.
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: [1, 2\n"
}

HTTP 422
