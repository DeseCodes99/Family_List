import os
import secrets
import dj_database_url
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent.parent
DATA = Path(os.getenv("DATA_DIR", BASE / "data")).resolve()
ON_VERCEL = os.getenv("VERCEL") == "1"
LIVE = ON_VERCEL or os.getenv("APP_ENV") == "production"
if not ON_VERCEL:
    DATA.mkdir(parents=True, exist_ok=True)
DEBUG = False
deployment_hosts = [os.environ[key] for key in ("VERCEL_URL", "VERCEL_PROJECT_PRODUCTION_URL") if ON_VERCEL and os.getenv(key)]
default_url = "https://" + deployment_hosts[-1] if deployment_hosts else "http://localhost:8000"
SITE_URL = os.getenv("SITE_URL", default_url).rstrip("/")
if LIVE and not SITE_URL.startswith("https://"):
    raise ValueError("Set SITE_URL to the public HTTPS address")
ALLOWED_HOSTS = [urlsplit(SITE_URL).hostname] if LIVE else ["localhost", "127.0.0.1", "testserver"]
CSRF_TRUSTED_ORIGINS = [SITE_URL]
if ON_VERCEL:
    ALLOWED_HOSTS.extend(deployment_hosts)
    CSRF_TRUSTED_ORIGINS.extend("https://" + host for host in deployment_hosts)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
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
WSGI_APPLICATION = "family.wsgi.application"
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions", "lists"]
MIDDLEWARE = ["django.middleware.security.SecurityMiddleware","whitenoise.middleware.WhiteNoiseMiddleware","django.contrib.sessions.middleware.SessionMiddleware","django.middleware.csrf.CsrfViewMiddleware","django.contrib.auth.middleware.AuthenticationMiddleware","django.middleware.clickjacking.XFrameOptionsMiddleware"]
WHITENOISE_ROOT = BASE / "dist"
WHITENOISE_MAX_AGE = 60
DATABASES = {"default": {"ENGINE":"django.db.backends.sqlite3", "NAME": DATA / "wishlist.sqlite3", "OPTIONS":{"transaction_mode":"IMMEDIATE","timeout":20}}}
database_url = os.getenv("DATABASE_URL")
if database_url:
    if urlsplit(database_url).scheme not in ("postgres", "postgresql"):
        raise ValueError("DATABASE_URL must be a PostgreSQL connection string")
    DATABASES["default"] = dj_database_url.parse(database_url, conn_max_age=0)
    DATABASES["default"]["DISABLE_SERVER_SIDE_CURSORS"] = True
    if LIVE:
        DATABASES["default"]["OPTIONS"].setdefault("sslmode", "require")
elif ON_VERCEL:
    raise ValueError("Connect a PostgreSQL database and set DATABASE_URL in Vercel")
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

