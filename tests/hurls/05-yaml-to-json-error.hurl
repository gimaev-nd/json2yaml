# Ошибка парсинга YAML → 422, тело — тот же формат, что и у JSON:
# message (текст для человека), line и column (позиция, с единицы).
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: [1, 2\n"
}

HTTP 422
[Asserts]
header "Content-Type" contains "application/json"
jsonpath "$.message" isString
jsonpath "$.line" == 2
jsonpath "$.column" == 1

# Дубль ключа — ошибка конструктора, а не парсера.
# Регресс: раньше наружу уходил 500, потому что ловились только Scanner/Parser.
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: 1\nключ: 2\n"
}

HTTP 422
[Asserts]
jsonpath "$.message" isString
jsonpath "$.line" == 2
jsonpath "$.column" == 1

# Неразрешённый алиас — ошибка composer'а
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: *нет\n"
}

HTTP 422
[Asserts]
jsonpath "$.message" isString
jsonpath "$.line" == 1
jsonpath "$.column" == 7

# Неверное значение тега: ruyaml бросает обычный ValueError, а не YAMLError.
# У такой ошибки нет метки, поэтому позиция неизвестна.
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "ключ: !!int abc\n"
}

HTTP 422
[Asserts]
jsonpath "$.message" isString
jsonpath "$.line" == null
jsonpath "$.column" == null
