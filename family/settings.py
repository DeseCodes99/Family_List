import os
import secrets
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent.parent
DATA = Path(os.getenv("DATA_DIR", BASE / "data")).resolve()
DATA.mkdir(parents=True, exist_ok=True)
LIVE = os.getenv("APP_ENV") == "production"
DEBUG = False
SITE_URL = os.getenv("SITE_URL", "http://localhost:8000").rstrip("/")
if LIVE and not SITE_URL.startswith("https://"):
    raise ValueError("Set SITE_URL to the public HTTPS address")
ALLOWED_HOSTS = [urlsplit(SITE_URL).hostname] if LIVE else ["localhost", "127.0.0.1", "testserver"]
CSRF_TRUSTED_ORIGINS = [SITE_URL]
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")
if LIVE and (not SECRET_KEY or len(SECRET_KEY) < 50):
    raise ValueError("Set a random DJANGO_SECRET_KEY of at least 50 characters")
if not SECRET_KEY:
    keyfile = DATA / ".local-secret"
    if not keyfile.exists():
        with keyfile.open("x") as f:
            f.write(secrets.token_urlsafe(64))
    SECRET_KEY = keyfile.read_text()
ROOT_URLCONF = "family.urls"
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "lists"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware","whitenoise.middleware.WhiteNoiseMiddleware","django.contrib.sessions.middleware.SessionMiddleware","django.middleware.csrf.CsrfViewMiddleware","django.contrib.auth.middleware.AuthenticationMiddleware","django.middleware.clickjacking.XFrameOptionsMiddleware"]
WHITENOISE_ROOT = BASE / "dist"
WHITENOISE_MAX_AGE = 60
DATABASES = {"default": {"ENGINE":"django.db.backends.sqlite3", "NAME": DATA / "wishlist.sqlite3", "OPTIONS":{"transaction_mode":"IMMEDIATE","timeout":20}}}
TEMPLATES = [{"BACKEND":"django.template.backends.django.DjangoTemplates","DIRS":[BASE / "templates"],"APP_DIRS":True}]
DEFAULT_AUTO_FIELD = "django.db.models.AutoField"
USE_TZ = True
SESSION_COOKIE_SECURE = CSRF_COOKIE_SECURE = LIVE
SESSION_COOKIE_AGE = 604800
SECURE_HSTS_SECONDS = 31536000 if LIVE else 0
PASSWORD_RESET_TIMEOUT = 3600
AUTH_PASSWORD_VALIDATORS = [{"NAME":"django.contrib.auth.password_validation.MinimumLengthValidator","OPTIONS":{"min_length":12}},{"NAME":"django.contrib.auth.password_validation.CommonPasswordValidator"}]
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend" if LIVE else "django.core.mail.backends.console.EmailBackend"
EMAIL_HOST = os.getenv("SMTP_HOST","")
EMAIL_PORT = int(os.getenv("SMTP_PORT","587"))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.getenv("SMTP_USER","")
EMAIL_HOST_PASSWORD = os.getenv("SMTP_PASSWORD","")
DEFAULT_FROM_EMAIL = os.getenv("FROM_EMAIL","wishlist@localhost")
EMAIL_TIMEOUT = 10

