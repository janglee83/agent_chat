# syntax=docker/dockerfile:1.7
# DEV-ONLY image: just the toolchain (Node + pnpm). Nothing from the repo is baked in —
# docker-compose.yml bind-mounts the source and keeps node_modules in named volumes,
# so code changes hot-reload and macOS/Linux native binaries never mix.
# This project is not deployed to production.

ARG NODE_VERSION=24.21.0
FROM node:${NODE_VERSION}-alpine

ARG PNPM_VERSION=12.8.1
RUN npm install --global --no-fund --no-audit pnpm@${PNPM_VERSION}

# CI=true: non-interactive pnpm. HUSKY=0: git hooks are installed on the host, not here.
# The pnpm store lands inside the node_modules volume, same filesystem → hardlinks, no copies.
ENV CI=true \
    HUSKY=0

WORKDIR /repo
