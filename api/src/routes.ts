import { Response } from "express"
import { logger } from './logging'

export const attachRoutes = (app: any): void => {
    app.get("/", async (req: Request, res: Response) => {
        res.send("I'm an API!")
        logger.info("I got a request!")
    })
}