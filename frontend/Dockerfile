# Multi-stage Dockerfile for Kaveri Stays React Frontend

# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for Docker caching
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .

# Argument to pass custom API URL during build if required
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: Serve the production static files with Nginx
FROM nginx:alpine

# Remove default nginx html files
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for SPA routing & gzip
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
