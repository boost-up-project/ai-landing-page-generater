FROM nginx:alpine

COPY index.html styles.css script.js brand-api.js campaign-api.js persona-api.js landing-api.js landing-editor.js landing-editor.css /usr/share/nginx/html/
COPY runtime-config.js runtime-config.template.js /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY docker-entrypoint.d/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1
