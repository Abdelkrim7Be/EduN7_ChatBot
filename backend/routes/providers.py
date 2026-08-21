from flask import Blueprint, jsonify

from middleware.auth import require_auth
from services.llm_factory import get_available_providers

providers_bp = Blueprint("providers", __name__)


@providers_bp.route("/api/providers", methods=["GET"])
@require_auth
def list_providers():
    # Which provider keys are configured is internal deployment detail —
    # don't hand it to anonymous callers.
    return jsonify({"providers": get_available_providers()}), 200
