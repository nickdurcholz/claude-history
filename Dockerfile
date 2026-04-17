FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./
RUN npm install --omit=dev
ENV CLAUDE_DIR=/.claude
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server/index.js"]
