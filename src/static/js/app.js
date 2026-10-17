let vs = window.location.origin + '/static/vendor/monaco-editor/min/vs';

require.config({ paths: { 'vs': vs } });

const DEBOUNCE_MS = 300;
// Ошибка разбора входного текста: по контракту API тело ответа — описание
// ошибки в формате YAML.
const ERROR_STATUS = 422;
// Владелец меток ошибок: метки других владельцев (например, JSON-валидатора
// Monaco) не затрагиваются.
const MARKER_OWNER = 'json2yaml';

let debounceTimer = null;
let isUpdating = false;
// Номер последнего запроса по каждому направлению конвертации. Ответы могут
// прийти не в порядке отправки, а показать нужно самый свежий.
const last_request = {};

require(['vs/editor/editor.main'], async function () {
    // Начальное содержимое редакторов — примеры из статики
    const [jsonExample, yamlExample] = await Promise.all([
        fetch('static/site/example.json').then((r) => r.text()),
        fetch('static/site/example.yaml').then((r) => r.text()),
    ]);

    function createEditor(lang, value) {
        const editorElement = document.getElementById(`${lang}-editor`);
        return monaco.editor.create(editorElement, {
            value: value,
            language: lang,
            theme: 'vs-dark',
            automaticLayout: true
        });
    }
    window.jsonEditor = createEditor('json', jsonExample);
    jsonEditor.getModel().onDidChangeContent(console.log);
    jsonEditor.getModel().onDidChangeContent(need_yaml_update);

    window.yamlEditor = createEditor('yaml', yamlExample);
    yamlEditor.getModel().onDidChangeContent(console.log);
    yamlEditor.getModel().onDidChangeContent(need_json_update);
});

function need_yaml_update() {
    delayed_update('/api/json-to-yaml', jsonEditor, yamlEditor);
}
function need_json_update() {
    delayed_update('/api/yaml-to-json', yamlEditor, jsonEditor);
}

function delayed_update(api_url, from_editor, to_editor) {
    if (isUpdating) { return; }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        const text = from_editor.getValue();

        // Пустой текст разбирать нечего: любая конвертация вернула бы ошибку,
        // поэтому очищаем и соседний редактор.
        if (text.trim() === '') {
            set_value(to_editor, '');
            return;
        }

        const request = (last_request[api_url] || 0) + 1;
        last_request[api_url] = request;

        fetch(api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text }),
        })
            .then((response) => response.text().then((body) => ({ response, body })))
            .then(({ response, body }) => {
                // 422 — ошибка во входном тексте: показываем её описание
                // в соседнем редакторе, чтобы она была видна рядом с правкой,
                // а не только в консоли.
                if (response.status === ERROR_STATUS) { return { body, is_error: true }; }
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${body}`);
                }
                return { body, is_error: false };
            })
            .then(({ body, is_error }) => {
                // Устаревший ответ не должен затирать результат свежего
                if (last_request[api_url] !== request) { return; }
                set_value(to_editor, body, is_error);
            })
            .catch((error) => {
                console.error('Error converting', error);
            });
    }, DEBOUNCE_MS);
}

// Запись в редактор не должна вызываться как правка пользователя: иначе
// сработает обратная конвертация и редакторы начнут переписывать друг друга.
// is_error помечает текст меткой ошибки, чтобы описание ошибки не приняли
// за результат конвертации (в YAML-редакторе оно выглядит как обычный документ).
function set_value(editor, text, is_error = false) {
    if (editor.getValue() !== text) {
        isUpdating = true;
        try {
            editor.setValue(text);
        } finally {
            isUpdating = false;
        }
    }

    const model = editor.getModel();
    const last_line = model.getLineCount();
    const markers = is_error
        ? [{
            severity: monaco.MarkerSeverity.Error,
            message: text,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: last_line,
            endColumn: model.getLineMaxColumn(last_line),
        }]
        : [];
    monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
}
