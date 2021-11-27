import e, { Router } from "express"
import { logger } from '../logging'
import { ldapClient, searchAsyncUid } from "../ldap";
import * as jf from 'joiful';
import { RSA_NO_PADDING } from "constants";

const VALID_CLASSES=["22", "23", "24", "25", "faculty", "staff"]

class CreateAccountReq {
    // usernames must comply with debian/ubuntu standards so we can give them
    // Heron accounts
    @jf.string().regex(/^[a-z][-a-z0-9]*$/, "posixUsername").required()
    username: string

    @jf.string().email().regex(/.+@swarthmore\.edu/).required()
    email: string

    @jf.string().required()
    name: string

    // FIXME would be nice to not manually update this every year
    // TODO for that matter, can't we pull this from Cygnet?
    @jf.string().valid(VALID_CLASSES).required()
    classYear: string
}

export const attachAccountRoutes = (app: any) => {
    const router = Router()

    router.get("/create", (req, res) => {
        // TODO how do we handle someone going to create an account if they're 
        //  already logged in?
        res.render('createAccount', {classes: VALID_CLASSES})
    })

    router.post("/create", (req: any, res) => {
        const { error, value } = jf.validateAsClass(req.body, CreateAccountReq)

        if (error) {
            logger.warn(`CreateAccountReq validation error: ${error.message}`)
            return res.status(400).send(`Invalid request: ${error.message}`)
        }

        logger.info(`Submitting CreateAccountReq ${JSON.stringify(value)}`)
        res.render('createAccountSuccess', {email: value.email})
    })

    router.get('/username-ok/:username', async (req: any, res) => {
        if (await searchAsyncUid(ldapClient, req.params.username)) {
            logger.debug(`${req.params.username} already exists`)
            res.send(false)
        } else {
            res.send(true)
            logger.debug(`${req.params.username} does not already exist`)
        }
    })

    app.use("/account", router)
}