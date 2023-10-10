# See https://stackoverflow.com/questions/74256433/tauri-development-in-vs-code-dev-container
FROM debian:bullseye

ENV DEBIAN_FRONTEND=noninteractive

# install dependencies from package manager
RUN apt update && \
    apt install -y libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# install rust
RUN curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh -s -- -y

# install nodejs, npm & yarn
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && apt-get install -y nodejs
RUN npm install -g pnpm

RUN apt install -y git

# create 'dev' user
RUN mkdir /home/dev
RUN useradd -u 1000 dev && chown -R dev /home/dev
