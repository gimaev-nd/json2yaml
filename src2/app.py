from pathlib import Path

from litestar import Litestar, get
from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.response import Template
from litestar.template.config import TemplateConfig

template_config = TemplateConfig(
    directory=Path("templates"), engine=JinjaTemplateEngine
)


@get(path="/")
def index() -> Template:
    return Template(template_name="index.html")


app = Litestar(route_handlers=[index], template_config=template_config)
