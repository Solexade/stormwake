FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.js chain.js ./
COPY public ./public
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5180 DATA_DIR=/app/data
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME /app/data
EXPOSE 5180
CMD ["node", "server.js"]
