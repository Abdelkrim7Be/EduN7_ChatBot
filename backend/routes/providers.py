from flask import Blueprint, jsonify
from services.llm_factory import get_available_providers

providers_bp = Blueprint("providers", __name__)


@providers_bp.route("/api/providers", methods=["GET"])
def list_providers():
    return jsonify({"providers": get_available_providers()}), 200
