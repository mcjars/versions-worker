# versions-worker - MCJars Minecraft Versions API

mcvapi (versions-worker) is an api tool for retrieving Minecraft server versions. It allows you to easily download, install, and lookup Minecraft server versions. This is the api part that runs on Cloudflare Workers.

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

> [!NOTE]
> NOT AN OFFICIAL MINECRAFT SERVICE. NOT APPROVED BY OR ASSOCIATED WITH MOJANG OR MICROSOFT.
