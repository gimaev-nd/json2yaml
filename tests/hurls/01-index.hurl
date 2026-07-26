# Главная страница отдаётся как HTML-файл
GET http://{{host}}/

HTTP 200
[Asserts]
header "Content-Type" contains "text/html"
