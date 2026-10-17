# Ошибка парсинга YAML → 422, тело — описание ошибки в формате YAML.
# Точный текст сообщения зависит от реализации бекенда, проверяем только код.
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: [1, 2\n"
}

HTTP 422

# Дубль ключа — ошибка конструктора, а не парсера.
# Регресс: раньше наружу уходил 500, потому что ловились только Scanner/Parser.
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: 1\nключ: 2\n"
}

HTTP 422

# Неразрешённый алиас — ошибка composer'а
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: *нет\n"
}

HTTP 422

# Неверное значение тега: ruyaml бросает обычный ValueError, а не YAMLError
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: !!int abc\n"
}

HTTP 422
