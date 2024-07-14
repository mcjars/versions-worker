import { GlobalRouter } from "../.."

import statsRouter from "./stats"

export default function(router: GlobalRouter) {
	statsRouter(router)
}