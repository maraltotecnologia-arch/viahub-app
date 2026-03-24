# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package info first and install dependencies
COPY package.json package-lock.json* bun.lockb* ./

# If using npm or yarn. package-lock may not exist if npm alternative.
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve built app
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
