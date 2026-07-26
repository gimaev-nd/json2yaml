# YAML → JSON: pretty-print с отступом 2, кириллица как есть (ensure_ascii=False)
POST http://{{host}}/api/yaml-to-json
Content-Type: application/json
{
  "text": "привет: мир\nсписок:\n  - раз\n  - два\nчисло: 42\nфлаг: true\nпусто: null\n"
}

HTTP 200
[Asserts]
header "Content-Type" contains "text/plain"
# Тело сравнивается побайтово с эталоном: в конце ответа нет перевода строки
file,expected/yaml-to-json.json;
