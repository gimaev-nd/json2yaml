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
    var jsonEditor = createEditor('json');
    var yamlEditor = createEditor('yaml');
    jsonEditor.getModel().onDidChangeContent(console.log);
});
