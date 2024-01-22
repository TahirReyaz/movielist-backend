import express from "express";
import authentication from "./authentication.js";
import users from "./users.js";
import media from "./media.js";
import lists from "./lists.js";
import entries from "./listEntries.js";
const router = express.Router();
export default () => {
    router.get("/", async (req, res) => {
        res.send("HELLO WORLD");
    });
    authentication(router);
    users(router);
    media(router);
    lists(router);
    entries(router);
    return router;
};
