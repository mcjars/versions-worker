# versions-worker - MCJars Minecraft Versions API

> [!CAUTION]  
> This project is still in development and is not yet ready for production use.
> Most things have NOT been tested yet and may not work as expected.

mcvapi (versions-worker) is an api tool for retrieving Minecraft server versions. It allows you to easily download, install, and lookup Minecraft server versions.

## Features

- Runs on Cloudflare Workers for high availability
- Fast Reverse Hash Lookup
- Data is cached for fast repeated retrievals
- Available in most regions

## Developing

To Develop on this api tool, you need to install all required dependencies

```bash
git clone https://github.com/mcjars/versions-worker.git versions-worker

cd versions-worker

# make sure to have nodejs installed already
npm i -g pnpm
pnpm i

# fill out the configs
cp wrangler.toml.example wrangler.toml
cp drizzle.config.json.example drizzle.config.json

# after filling out the configs
pnpm kit migrate

# start the dev server on port 6901
pnpm dev
```
