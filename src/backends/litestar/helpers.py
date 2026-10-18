from io import StringIO
import json
import re
from pprint import pformat

import ruyaml as yaml

custom_yaml = yaml.YAML()
custom_yaml.indent(mapping=2, sequence=2, offset=0)


def _str_representer(representer, data):
    """Многострочные строки — блочный литерал `|`, однострочные — обычный скаляр.

    Стиль скаляра в YAML — свойство узла, глобальной настройки у дампера нет,
    поэтому выбираем его здесь: `key: value` для однострочных значений и
    `key: |` для многострочных. Chomping (`|`/`|-`) и индикатор отступа ruyaml
    подбирает сам, текст читается обратно без искажений; строки с ведущими
    пробелами, табами и хвостовыми пробелами тоже остаются валидными.
    """

    style = "|" if "\n" in data else None
    return representer.represent_scalar("tag:yaml.org,2002:str", data, style=style)


custom_yaml.representer.add_representer(str, _str_representer)


class PythonJSONEncoder(json.JSONEncoder):
    def default(self, o):
        # noinspection PyBroadException
        try:
            value = super().default(o)
        except Exception:
            value = pformat(o, indent=2)
            if "\n" in value:
                return value.split("\n")
            return value
        return value


def as_pretty_json(value):
    if value is None:
        return ""
    return json.dumps(value, indent=2, cls=PythonJSONEncoder, ensure_ascii=False)


def as_yaml(value):
    s = StringIO()
    custom_yaml.dump(value, s)
    return s.getvalue()


# Сообщения json-декодера на русском. Ключи — в нижнем регистре: в разных
# версиях Python регистр первой буквы msg отличается.
JSON_MESSAGES = {
    "expecting value": "Ожидалось значение",
    "expecting property name enclosed in double quotes": (
        "Ожидалось имя свойства в двойных кавычках"
    ),
    "expecting ':' delimiter": "Ожидалось двоеточие после имени свойства",
    "expecting ',' delimiter": "Ожидалась запятая между элементами",
    "extra data": "Лишние данные после конца документа",
    "unterminated string starting at": "Незакрытая строка",
    "invalid control character at": "Недопустимый управляющий символ",
    "invalid \\escape": "Недопустимая escape-последовательность",
    "invalid \\uxxxx escape": "Недопустимая escape-последовательность \\uXXXX",
    "invalid number": "Недопустимое число",
}

# Технические имена узлов ruyaml, которые встречаются в тексте ошибок.
YAML_TOKENS = {
    "<block end>": "конец блока",
    "<block mapping start>": "начало блока",
    "<block sequence start>": "начало последовательности",
    "<flow mapping start>": "начало отображения в потоке",
    "<flow sequence start>": "начало последовательности в потоке",
    "<stream end>": "конец потока",
    "<document start>": "начало документа",
    "<document end>": "конец документа",
}

# problem у ruyaml — техническая строка на английском. Переводим известные
# шаблоны, остальное отдаём как есть: лучше английский текст, чем `{}`.
YAML_PATTERNS = (
    (re.compile(r"^expected (.+?), but (?:got|found) (.+)$"),
     "Ожидалось: {0}. Встретилось: {1}"),
    (re.compile(r"^found duplicate key \"(.*)\" with value \"(.*)\" "
                r"\(original value: \"(.*)\"\)$"),
     "Повторяющийся ключ «{0}»: значение «{1}», ранее — «{2}»"),
    (re.compile(r"^found duplicate key (.*) with value (.*) "
                r"\(original value: (.*)\)$"),
     "Повторяющийся ключ {0}: значение {1}, ранее — {2}"),
    (re.compile(r"^found undefined alias '?(.*?)'?$"),
     "Неизвестный алиас «{0}»"),
    (re.compile(r"^found character '(.*)' that cannot start any token$"),
     "Символ '{0}' не может начинать токен"),
    (re.compile(r"^could not determine a constructor for the tag '?(.*?)'?$"),
     "Неизвестный тег «{0}»"),
    (re.compile(r"^found unexpected end of stream$"),
     "Неожиданный конец файла"),
    (re.compile(r"^found unexpected ':'$"),
     "Неожиданное двоеточие"),
    (re.compile(r"^could not find expected ':'$"),
     "Не найдено ожидаемое двоеточие"),
    (re.compile(r"^invalid literal for int\(\) with base \d+: (.*)$"),
     "Недопустимое целое число: {0}"),
    (re.compile(r"^could not convert string to float: (.*)$"),
     "Недопустимое число: {0}"),
)


def _humanize_token(token):
    token = token.strip()
    name = token.strip("'\"")
    if name in YAML_TOKENS:
        return YAML_TOKENS[name]
    return token.replace(" or ", " или ")


def _humanize_yaml_problem(problem):
    for pattern, template in YAML_PATTERNS:
        match = pattern.match(problem)
        if match:
            return template.format(*(_humanize_token(g) for g in match.groups()))
    return problem


def _yaml_error(exp):
    # У части исключений (например, ValueError из int()) нет ни problem,
    # ни метки — позиция в таких случаях неизвестна.
    message = _humanize_yaml_problem(getattr(exp, "problem", None) or str(exp))
    mark = getattr(exp, "problem_mark", None) or getattr(exp, "context_mark", None)
    if mark is None:
        return message, None, None
    return message, mark.line + 1, mark.column + 1


def get_error(exp):
    """Единый формат ошибки разбора для JSON и YAML.

    message — текст для человека, line/column — позиция в исходном тексте
    (нумерация с единицы). None означает, что позиция неизвестна.
    """
    if isinstance(exp, json.JSONDecodeError):
        return {
            "message": JSON_MESSAGES.get(exp.msg.lower(), exp.msg),
            "line": exp.lineno,
            "column": exp.colno,
        }
    message, line, column = _yaml_error(exp)
    return {"message": message, "line": line, "column": column}
