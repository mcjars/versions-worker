import { GlobalRouter } from "../.."

import buildRouter from "./build"
import configRouter from "./config"
import statsRouter from "./stats"
import buildsRouter from "./builds"

export default function(router: GlobalRouter) {
	buildRouter(router)
	configRouter(router)
	statsRouter(router)
	buildsRouter(router)
}