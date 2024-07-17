import { GlobalRouter } from "../.."

import buildRouter from "./build"
import statsRouter from "./stats"
import buildsRouter from "./builds"

export default function(router: GlobalRouter) {
	buildRouter(router)
	statsRouter(router)
	buildsRouter(router)
}