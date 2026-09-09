import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


def create_app() -> Flask:
    import config
    import database
    database.init_db()

    app = Flask(__name__)
    if config.TRUST_PROXY_HEADERS:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    CORS(
        app,
        resources={r"/api/*": {"origins": config.ALLOWED_ORIGINS}},
        supports_credentials=True,
    )

    from limiter_instance import limiter
    limiter.init_app(app)

    from routes.admin import admin_bp
    from routes.auth import auth_bp
    from routes.chat import chat_bp
    from routes.conversations import conversations_bp
    from routes.documents import documents_bp
    from routes.providers import providers_bp
    from routes.public_assistant import public_assistant_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(providers_bp)
    app.register_blueprint(conversations_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(public_assistant_bp)

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok"}), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error"}), 500

    @app.errorhandler(429)
    def rate_limited(e):
        from flask import request
        if request.path.startswith("/api/public-assistant/"):
            from services.public_assistant_service import record_event
            record_event(
                ip_address=request.remote_addr,
                user_agent=request.headers.get("User-Agent"),
                outcome="rate_limited",
            )
        return jsonify({"error": "Too many requests. Please try again later."}), 429

    return app


if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", "8080"))
    app.run(host="0.0.0.0", port=port, threaded=True, debug=False)
