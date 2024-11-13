import logger from "@/globals/logger"
import * as fs from "fs"
import env from "@/globals/env"
import { system } from "@rjweb/utils"

export default function getVersion() {
	return `${JSON.parse(fs.readFileSync('../package.json', 'utf8')).version}:${system.execute('git rev-parse --short=10 HEAD').trim()}`
}

logger()
	.text('Launching Services...', (c) => c.yellowBright)
	.text(`(${process.env.NODE_ENV === 'development' ? 'development' : 'production'} ${getVersion()})`, (c) => c.gray)
	.text(`\nlog directory: ${env.LOG_DIRECTORY ?? '<none>'}`, (c) => c.gray)
	.text('\n')
	.info()

require('@/api')