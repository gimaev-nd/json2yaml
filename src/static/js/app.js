let vs = window.location.origin + '/static/vendor/monaco-editor/min/vs';

require.config({ paths: { 'vs': vs } });

let debounceTimer = null;
let isUpdating = false;

require(['vs/editor/editor.main'], function () {
    function createEditor(lang) {
        const jsonEditorTextElement = document.getElementById(`${lang}-editor-text`);
        const json_value = jsonEditorTextElement.textContent;
        jsonEditorTextElement.remove()

        // Создаем редактор
        const jsonEditorElement = document.getElementById(`${lang}-editor`);
        return monaco.editor.create(jsonEditorElement, {
            value: json_value,
            language: lang,
            theme: 'vs-dark',
            automaticLayout: true
        });
    }
    window.jsonEditor = createEditor('json');
    jsonEditor.getModel().onDidChangeContent(console.log);
    jsonEditor.getModel().onDidChangeContent(need_yaml_update);

    window.yamlEditor = createEditor('yaml');
    yamlEditor.getModel().onDidChangeContent(console.log);
    yamlEditor.getModel().onDidChangeContent(need_json_update);
});

function need_yaml_update() {
    delayed_update('/api/json-to-yaml', jsonEditor, yamlEditor)
}
function need_json_update() {
    delayed_update('/api/yaml-to-json', yamlEditor, jsonEditor)
}

function delayed_update(api_url, from_editor, to_editor) {
    if (isUpdating) { return }
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
        const jsonText = from_editor.getValue();

        fetch(api_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: jsonText }),
        })
            .then((response) => {
                if (!response.ok) {
                    console.error(response, response.text())
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then((text) => {
                if (isUpdating) { return }
                isUpdating = true;
                to_editor.setValue(text);
                isUpdating = false;
            })
            .catch((error) => {
                console.error('Error converting', error);
            });
    }, 300);
}
