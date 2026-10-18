let vs = window.location.origin + '/static/vendor/monaco-editor/min/vs';

require.config({ paths: { 'vs': vs } });

const DEBOUNCE_MS = 300;
// Ошибка разбора входного текста: по контракту API тело ответа — JSON
// {"message": "<текст для человека>", "line": <строка>, "column": <позиция>}.
const ERROR_STATUS = 422;
// Владелец меток ошибок: метки других владельцев (например, JSON-валидатора
// Monaco) не затрагиваются.
const MARKER_OWNER = 'json2yaml';
const LANG_LABEL = { json: 'JSON', yaml: 'YAML' };

let debounceTimer = null;
let isUpdating = false;
// Номер последнего запроса по каждому направлению конвертации. Ответы могут
// прийти не в порядке отправки, а показать нужно самый свежий.
const last_request = {};
const editors = {};
// Язык, ошибку разбора которого показывает панель целевого редактора.
const error_source = {};
// Позиция ошибки для перехода по клику на «Строка N, позиция M».
const error_point = {};

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
            automaticLayout: true,
            // Tab — два пробела, как в примерах и в ответах бекенда (indent=2).
            // detectIndentation выключен: иначе Monaco подстроится под отступы
            // вставленного текста и снова начнёт вставлять четыре.
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false
        });
    }
    editors.json = window.jsonEditor = createEditor('json', jsonExample);
    window.jsonEditor.getModel().onDidChangeContent(console.log);
    window.jsonEditor.getModel().onDidChangeContent(need_yaml_update);

    editors.yaml = window.yamlEditor = createEditor('yaml', yamlExample);
    window.yamlEditor.getModel().onDidChangeContent(console.log);
    window.yamlEditor.getModel().onDidChangeContent(need_json_update);

    for (const lang of Object.keys(LANG_LABEL)) {
        document
            .getElementById(`${lang}-error-close`)
            .addEventListener('click', () => hide_error(lang));
        document
            .getElementById(`${lang}-error-position`)
            .addEventListener('click', () => jump_to_error(lang));
    }
});

function need_yaml_update() {
    delayed_update('/api/json-to-yaml', 'json', 'yaml');
}
function need_json_update() {
    delayed_update('/api/yaml-to-json', 'yaml', 'json');
}

function delayed_update(api_url, from_lang, to_lang) {
    if (isUpdating) { return; }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        const text = editors[from_lang].getValue();

        // Пустой текст разбирать нечего: любая конвертация вернула бы ошибку,
        // поэтому очищаем и соседний редактор.
        if (text.trim() === '') {
            // Ответ на запрос, отправленный до очистки, уже неактуален.
            last_request[api_url] = (last_request[api_url] || 0) + 1;
            hide_error(to_lang);
            set_value(editors[to_lang], '');
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
                // в соседней колонке вместо результата конвертации.
                if (response.status === ERROR_STATUS) { return { error: parse_error(body) }; }
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${body}`);
                }
                return { body };
            })
            .then(({ body, error }) => {
                // Устаревший ответ не должен затирать результат свежего
                if (last_request[api_url] !== request) { return; }
                if (error) {
                    show_error(from_lang, to_lang, error);
                    return;
                }
                hide_error(to_lang);
                set_value(editors[to_lang], body);
            })
            .catch((error) => {
                console.error('Error converting', error);
            });
    }, DEBOUNCE_MS);
}

// Тело ошибки — JSON с полями message/line/column. Если пришёл не JSON
// (например, ошибка прокси), показываем текст как есть без позиции.
function parse_error(body) {
    try {
        const data = JSON.parse(body);
        if (data && typeof data.message === 'string') { return data; }
    } catch (e) {
        // не JSON — обработаем ниже
    }
    return {
        message: body.trim() || 'Не удалось разобрать ответ с описанием ошибки',
        line: null,
        column: null,
    };
}

// Ошибка показывается в колонке результата: сам результат заведомо устарел,
// пока входной текст сломан. В редакторе с ошибкой подсвечивается строка,
// а перейти к позиции можно кликом по «Строка N, позиция M».
function show_error(from_lang, to_lang, error) {
    const panel = document.getElementById(`${to_lang}-error`);
    document.getElementById(`${to_lang}-error-title`).textContent =
        `Ошибка в ${LANG_LABEL[from_lang]}`;
    document.getElementById(`${to_lang}-error-message`).textContent = error.message;
    const position = document.getElementById(`${to_lang}-error-position`);
    position.textContent = format_position(error);
    // Без позиции переходить некуда — оставляем текст, но не ссылку.
    position.disabled = error.line == null;

    document.getElementById(`${to_lang}-editor`).classList.add('hidden');
    panel.classList.remove('hidden');
    error_source[to_lang] = from_lang;
    delete error_point[to_lang];

    const source = editors[from_lang];
    const model = source.getModel();
    if (error.line == null) {
        monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
        return;
    }

    const line = Math.min(error.line, model.getLineCount());
    const column = Math.min(error.column || 1, model.getLineMaxColumn(line));
    error_point[to_lang] = { line, column };
    monaco.editor.setModelMarkers(model, MARKER_OWNER, [{
        severity: monaco.MarkerSeverity.Error,
        message: error.message,
        startLineNumber: line,
        startColumn: column,
        endLineNumber: line,
        endColumn: model.getLineMaxColumn(line),
    }]);
}

// Курсор переставляется только по явному клику на позицию ошибки: во время
// набора текста автоматический переход уводил бы пользователя с места правки.
function jump_to_error(to_lang) {
    const point = error_point[to_lang];
    const source = editors[error_source[to_lang]];
    if (!point || !source) { return; }

    const model = source.getModel();
    const line = Math.min(point.line, model.getLineCount());
    const column = Math.min(point.column, model.getLineMaxColumn(line));
    source.setPosition({ lineNumber: line, column });
    source.revealPositionInCenter({ lineNumber: line, column });
    source.focus();
}

// Закрытие панели возвращает колонке её редактор с последним удачным
// результатом конвертации.
function hide_error(to_lang) {
    const panel = document.getElementById(`${to_lang}-error`);
    if (panel.classList.contains('hidden')) { return; }

    panel.classList.add('hidden');
    document.getElementById(`${to_lang}-editor`).classList.remove('hidden');

    const source_lang = error_source[to_lang];
    if (source_lang && editors[source_lang]) {
        monaco.editor.setModelMarkers(editors[source_lang].getModel(), MARKER_OWNER, []);
    }
    delete error_source[to_lang];
    delete error_point[to_lang];

    // Редактор был скрыт (display: none) — Monaco не знает его размеров,
    // пока контейнер снова не станет видимым.
    editors[to_lang].layout();
}

function format_position({ line, column }) {
    if (line == null) { return 'Позиция в тексте не определена'; }
    if (column == null) { return `Строка ${line}`; }
    return `Строка ${line}, позиция ${column}`;
}

// Запись в редактор не должна вызываться как правка пользователя: иначе
// сработает обратная конвертация и редакторы начнут переписывать друг друга.
function set_value(editor, text) {
    if (editor.getValue() === text) { return; }
    isUpdating = true;
    try {
        editor.setValue(text);
    } finally {
        isUpdating = false;
    }
}
