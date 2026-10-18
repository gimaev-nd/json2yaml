# Ошибка парсинга JSON → 422, тело — JSON с единым описанием ошибки:
# message (текст для человека), line и column (позиция, с единицы).
POST http://{{host}}/api/json-to-yaml
Content-Type: application/json
{
  "text": "{\"сломано\": "
}

HTTP 422
[Asserts]
header "Content-Type" contains "application/json"
jsonpath "$.message" == "Ожидалось значение"
jsonpath "$.line" == 1
jsonpath "$.column" == 13
