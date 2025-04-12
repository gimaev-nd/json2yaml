from dataclasses import dataclass
import json
from pathlib import Path

from litestar import Litestar, get, post
from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.response import Template
from litestar.template.config import TemplateConfig
from litestar.static_files import create_static_files_router
import ruyaml as yaml
from helpers import as_pretty_json, as_yaml, get_error


@dataclass
class Text:
    text: str


template_config = TemplateConfig(
    directory=Path("templates"), engine=JinjaTemplateEngine
)

static = create_static_files_router(path="/static", directories=["static"])


@get(path="/", sync_to_thread=False)
def index() -> Template:
    return Template(template_name="index.html")


@post("/api/yaml-to-json", sync_to_thread=False)
def y2j(data: Text) -> str:
    try:
        return as_pretty_json(yaml.load(data.text))
    except (yaml.scanner.ScannerError, yaml.parser.ParserError) as e:
        return get_error(e), 422


@post("/api/json-to-yaml", sync_to_thread=False)
def j2y(data: Text) -> str:
    data = json.loads(data.text)
    return as_yaml(data)


app = Litestar(
    route_handlers=[index, static, y2j, j2y], template_config=template_config
)
