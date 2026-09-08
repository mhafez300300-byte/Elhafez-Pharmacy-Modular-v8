FROM node:22-alpine AS build
WORKDIR /app
COPY elhafez_v860/package.json ./
RUN npm install --no-audit --no-fund
COPY elhafez_v860/ ./
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache chromium && ln -sf "$(command -v chromium-browser || command -v chromium)" /usr/local/bin/elhafez-chromium
ENV CHROMIUM_PATH=/usr/local/bin/elhafez-chromium
COPY elhafez_v860/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/data ./data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node","dist/app/server.js"]
