import { deleteUser, getAllUsers, updateUser, getProfile, } from "../controllers/users.js";
import { isAuthenticated, isOwner } from "../middlewares/index.js";
export default (router) => {
    router.get("/users", isAuthenticated, getAllUsers);
    router.get("/user/:username", getProfile);
    router.delete("/users/:id", isAuthenticated, isOwner, deleteUser);
    router.patch("/users/:id", isAuthenticated, isOwner, updateUser);
};
