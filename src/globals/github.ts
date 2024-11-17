import env from "@/globals/env"
import type { OAuthApp } from "@octokit/oauth-app"

let github: OAuthApp = null as any

import('@octokit/oauth-app').then(({ OAuthApp }) => {
	github = new OAuthApp({
		clientId: env.GITHUB_CLIENT_ID,
		clientSecret: env.GITHUB_CLIENT_SECRET
	})
})

export default () => github