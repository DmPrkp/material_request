# syntax=docker/dockerfile:1

# docker build -t ionic-client .
# docker run -p 5173:5173 --name ionic-client ionic-client

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV production

WORKDIR /usr/app

RUN npm i -g typescript
RUN rm -rf /usr/local/go
# Set the Go version
ARG GO_VERSION=1.22.2

# Set the URL for downloading Go
ARG GO_URL=https://golang.org/dl/go$GO_VERSION.linux-amd64.tar.gz

# Download and install Go
RUN wget -O go.tgz "$GO_URL" \
    && tar -C /usr/local -xzf go.tgz \
    && rm go.tgz

# Set the Go environment variables
ENV PATH="/usr/local/go/bin:${PATH}"

RUN go version

COPY ./package.json ./
RUN npm install
COPY ./ .
# RUN npm install -D @vitejs/plugin-vue
# RUN npm install -D @vitejs/plugin-legacy
# COPY ./shared ./shared

EXPOSE 5173

# Run the application.
# CMD node test.js
# CMD vite
CMD ["go", "run", "static-server.go"]
