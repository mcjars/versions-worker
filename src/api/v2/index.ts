import { GlobalRouter } from "../.."

import buildRouter from "./build"
import statsRouter from "./stats"

export default function(router: GlobalRouter) {
	buildRouter(router)
	statsRouter(router)
}