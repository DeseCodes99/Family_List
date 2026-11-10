FROM node:24-bookworm-slim AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY frontend ./frontend
RUN npm run build

FROM python:3.13-slim
ENV PYTHONUNBUFFERED=1 APP_ENV=production DATA_DIR=/data PORT=8000
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && useradd -u 10001 --create-home wishlist && mkdir /data && chown wishlist /data
COPY manage.py .
COPY family ./family
COPY lists ./lists
COPY --from=web /app/dist ./dist
USER wishlist
EXPOSE 8000
CMD ["sh","-c","python manage.py migrate --noinput && exec waitress-serve --listen=0.0.0.0:$PORT family.wsgi:application"]
