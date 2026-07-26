let vs = window.location.origin + '/static/vendor/monaco-editor/min/vs';

require.config({ paths: { 'vs': vs } });

let debounceTimer = null;
let isUpdating = false;

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
