from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
# Activer CORS pour toutes les origines pour faciliter le dev local et l'hébergement séparé
CORS(app)

# Configuration de la base de données
# En production sur Render, DATABASE_URL est fournie. En local, on utilise SQLite.
db_url = os.getenv("DATABASE_URL")
if db_url and db_url.startswith("postgres://"):
    # SQLAlchemy requiert 'postgresql://' au lieu de 'postgres://'
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = db_url or "sqlite:///dev.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# Modèle pour les messages / feedbacks
class Feedback(db.Model):
    __tablename__ = "feedbacks"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "message": self.message,
            "created_at": self.created_at.isoformat()
        }

@app.route("/")
def home():
    return "Flask + Docker + GHCR + Terraform + Render (ATELIER RENDER 2026)"

@app.route("/health")
def health():
    return {"status": "Tout est ok ou pas"}

@app.route("/info")
def info():
    return {
        "app": "Flask Render",
        "student": "Josué Perrault",
        "version": "v1"
    }

@app.route("/env")
def env():
    return {"env": os.getenv("ENV")}

# --- ENDPOINTS POUR LA PLATEFORME DE DÉVELOPPEMENT ---

@app.route("/api/status", methods=["GET"])
def get_db_status():
    try:
        # Exécuter une requête simple pour tester la connexion
        db.session.execute(db.text("SELECT 1"))
        return jsonify({
            "status": "connected",
            "dialect": db.engine.dialect.name,
            "database": db.engine.url.database,
            "host": db.engine.url.host or "local"
        })
    except Exception as e:
        return jsonify({
            "status": "disconnected",
            "error": str(e),
            "dialect": db.engine.dialect.name if db.engine else "unknown"
        }), 500

@app.route("/api/init-db", methods=["POST"])
def init_db():
    try:
        db.create_all()
        return jsonify({
            "status": "success",
            "message": "La base de données a été initialisée avec succès !"
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/api/messages", methods=["GET"])
def get_messages():
    try:
        # S'assurer que la table existe, sinon renvoyer une liste vide ou l'erreur appropriée
        feedbacks = Feedback.query.order_by(Feedback.created_at.desc()).all()
        return jsonify([f.to_dict() for f in feedbacks])
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": "La table n'existe probablement pas ou n'est pas initialisée. Veuillez utiliser le bouton d'initialisation de la BDD.",
            "error_detail": str(e)
        }), 200  # Renvoyer 200 pour éviter de bloquer l'UI, mais avec un message d'explication

@app.route("/api/messages", methods=["POST"])
def create_message():
    try:
        data = request.get_json() or {}
        name = data.get("name")
        message = data.get("message")
        
        if not name or not message:
            return jsonify({
                "status": "error",
                "message": "Le nom et le message sont requis."
            }), 400
            
        feedback = Feedback(name=name, message=message)
        db.session.add(feedback)
        db.session.commit()
        return jsonify(feedback.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
