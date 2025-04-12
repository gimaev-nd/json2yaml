let vs = window.location.origin + '/static/vendor/monaco-editor/min/vs';

require.config({ paths: { 'vs': vs } });

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
    window.yamlEditor = createEditor('yaml');
    jsonEditor.getModel().onDidChangeContent(console.log);
});


async function json_to_yaml() {
    const text = window.jsonEditor.getValue();
    const body = JSON.stringify({ "text": text });
    const response = await fetch("/api/json-to-yaml", {
        "method": "POST",
        "headers": { "content-type": "application/json" },
        "body": body,
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.text();
    return data;
}

async function yaml_to_json() {
    const text = window.yamlEditor.getValue();
    const body = JSON.stringify({ "text": text });
    const response = await fetch("/api/yaml-to-json", {
        "method": "POST",
        "headers": { "content-type": "application/json" },
        "body": body,
    });
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.text();
    return data;
}
