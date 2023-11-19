# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/engine/reference/builder/

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine

# Use production node environment by default.
# ENV NODE_ENV production

WORKDIR /usr/app

# Copy the rest of the source files into the image.
RUN npm i -g @nestjs/cli
RUN npm i -g typescript
COPY ./web-server/package*.json .
RUN npm ci
COPY ./web-server/ .
COPY ./shared-types/ ./shared-types/


# Expose the port that the application listens on.
EXPOSE 4000

# Run the application.
CMD npm run start:dev
