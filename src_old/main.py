from flask import Flask, request
import ruyaml as yaml
import json
from helpers import as_pretty_json, as_yaml, get_error

app = Flask(__name__)


@app.route("/")
def index():
    with open("index.html") as f:
        return f.read()


@app.route("/api/y2j", methods=["POST"])
def y2j():
    y = request.form["q"]
    try:
        return as_pretty_json(yaml.load(y))
    except (yaml.scanner.ScannerError, yaml.parser.ParserError) as e:
        return get_error(e), 422


@app.route("/api/j2y", methods=["POST"])
def j2y():
    j = request.form["q"]
    data = json.loads(j)
    return as_yaml(data)


if __name__ == "__main__":
    app.run()
