import { GlobalRouter } from "../.."

import buildRouter from "./build"
import configRouter from "./config"
import statsRouter from "./stats"
import requestsRouter from "./requests"
import buildsRouter from "./builds"
import sharesRouter from "./shares"

export default function(router: GlobalRouter) {
	buildRouter(router)
	configRouter(router)
	statsRouter(router)
	requestsRouter(router)
	buildsRouter(router)
	sharesRouter(router)
}