from pathlib import Path

from litestar import Litestar, get
from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.response import Template
from litestar.template.config import TemplateConfig
from litestar.static_files import create_static_files_router

template_config = TemplateConfig(
    directory=Path("templates"), engine=JinjaTemplateEngine
)


@get(path="/")
def index() -> Template:
    return Template(template_name="index.html")


static = create_static_files_router(path="/static", directories=["static"])

app = Litestar(route_handlers=[index, static], template_config=template_config)
