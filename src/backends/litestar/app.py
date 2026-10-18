from dataclasses import dataclass
import json
from pathlib import Path

from litestar import Litestar, Response, get, post
from litestar.response import File
from litestar.static_files import create_static_files_router
import ruyaml
from ruyaml import YAMLError
from helpers import as_pretty_json, as_yaml, get_error

yaml = ruyaml.YAML(typ="safe")

# Общая статика всех бекендов: src/static (бекенды лежат в src/backends/<имя>/)
STATIC_DIR = Path(__file__).resolve().parent.parent.parent / "static"


@dataclass
class Text:
    text: str


static = create_static_files_router(path="/static", directories=[STATIC_DIR])


def error_response(exp) -> Response:
    # Успешный ответ роутов — plain text, поэтому без явного media_type
    # Litestar попытается сериализовать dict ошибки как текст и упадёт в 500.
    return Response(get_error(exp), status_code=422, media_type="application/json")


@get(path="/", sync_to_thread=False)
def index() -> File:
    return File(
        path=STATIC_DIR / "site" / "index.html",
        media_type="text/html",
        content_disposition_type="inline",
    )


@post("/api/yaml-to-json", status_code=200, sync_to_thread=False)
def y2j(data: Text) -> Response:
    try:
        value = yaml.load(data.text)
        return Response(as_pretty_json(value), media_type="text/plain")
    except YAMLError as e:
        return error_response(e)
    # ruyaml пропускает наружу не только YAMLError: например, `!!int abc`
    # падает обычным ValueError из int(). Любая ошибка на этом шаге вызвана
    # входным текстом, поэтому отвечаем 422, а не 500 — как в j2y.
    except Exception as e:
        return error_response(e)


@post("/api/json-to-yaml", status_code=200, sync_to_thread=False)
def j2y(data: Text) -> Response:
    try:
        data = json.loads(data.text)
        return Response(as_yaml(data), media_type="text/plain")
    except json.JSONDecodeError as e:
        return error_response(e)
    except Exception as e:
        return error_response(e)


app = Litestar(route_handlers=[index, static, y2j, j2y])
