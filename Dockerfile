# Multi-stage production build for CampusConnect (Cloud Run / AI Studio Host)
FROM node:22-alpine AS builder
WORKDIR /workspace

# Copy dependencies manifest
COPY ui/package*.json ./ui/
WORKDIR /workspace/ui
RUN npm ci

# Copy full UI source and compile production bundle
COPY ui/ ./
RUN npm run build

# Runner stage: minimal production container
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copy built frontend assets and server runtime
COPY --from=builder /workspace/ui/dist ./dist
COPY --from=builder /workspace/ui/package*.json ./
COPY --from=builder /workspace/ui/server ./server
COPY --from=builder /workspace/ui/src/types.ts ./src/types.ts
COPY --from=builder /workspace/ui/tsconfig.json ./tsconfig.json

# Install runtime production dependencies and global tsx runner
RUN npm ci --omit=dev && npm install -g tsx

EXPOSE 8080
CMD ["tsx", "server/index.ts"]
