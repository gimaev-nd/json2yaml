from dataclasses import dataclass
import json
from pathlib import Path

from litestar import Litestar, Response, get, post
from litestar.response import File
from litestar.static_files import create_static_files_router
import ruyaml
from helpers import as_pretty_json, as_yaml, get_error

yaml = ruyaml.YAML(typ="safe")

# Общая статика всех бекендов: src/static (бекенды лежат в src/backends/<имя>/)
STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "static"


@dataclass
class Text:
    text: str


static = create_static_files_router(path="/static", directories=[STATIC_DIR])


@get(path="/", sync_to_thread=False)
def index() -> File:
    return File(
        path=STATIC_DIR / "site" / "index.html",
        media_type="text/html",
        content_disposition_type="inline",
    )


@post("/api/yaml-to-json", sync_to_thread=False)
def y2j(data: Text) -> str:
    try:
        value = yaml.load(data.text)
        return as_pretty_json(value)
    except (yaml.scanner.ScannerError, yaml.parser.ParserError) as e:
        return Response(get_error(e), status_code=422)


@post("/api/json-to-yaml", sync_to_thread=False)
def j2y(data: Text) -> str:
    try:
        data = json.loads(data.text)
        return as_yaml(data)
    except json.JSONDecodeError as e:
        return Response(get_error(e), status_code=422)
    except Exception as e:
        return Response(get_error(e), status_code=422)


app = Litestar(route_handlers=[index, static, y2j, j2y])
