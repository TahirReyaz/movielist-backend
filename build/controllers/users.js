import { deleteUserById, getUserById, getUserByUsername, getUsers, } from "../db/users.js";
import { deleteListById } from "../db/lists.js";
export const getAllUsers = async (req, res) => {
    try {
        const users = await getUsers();
        return res.status(200).json(users);
    }
    catch (error) {
        console.error(error);
        return res.sendStatus(400);
    }
};
export const getProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const users = await getUserByUsername(username);
        return res.status(200).json(users);
    }
    catch (error) {
        console.error(error);
        return res.status(400).send({ message: "Some error occurred" });
    }
};
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // First delete the associated lists
        const { lists } = await getUserById(id);
        lists.forEach(async (list) => {
            await deleteListById(list.id);
        });
        // Then delete the user
        const deletedUser = await deleteUserById(id);
        return res.json(deletedUser);
    }
    catch (error) {
        console.error(error);
        return res.sendStatus(400);
    }
};
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await getUserById(id);
        // If the user with this id doesn't exist
        if (!user) {
            return res.status(400).send({ message: "User not found" });
        }
        for (const key in req.body) {
            if (req.body[key]) {
                user.set(key, req.body[key]);
            }
        }
        await user.save();
        return res.status(200).json(user).end();
    }
    catch (error) {
        console.error(error);
        return res.sendStatus(400);
    }
};
