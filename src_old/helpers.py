from io import StringIO
import ruyaml as yaml
import json
from pprint import pformat
from markupsafe import Markup

custom_yaml = yaml.YAML()
custom_yaml.indent(mapping=2, sequence=2, offset=0)


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


def get_error(exp):
    s = as_pretty_json(vars(exp))
    v = json.loads(s)
    return as_yaml(v)
