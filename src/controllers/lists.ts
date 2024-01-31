// import express from "express";

// import {
//   createNewList,
//   deleteListById,
//   getListById,
//   getLists,
// } from "../db/lists";
// import { getUserById, removeListItem } from "../db/users";

// type userListItem = {
//   listType: string;
//   id: string;
// };

// export const getAllLists = async (
//   req: express.Request,
//   res: express.Response
// ) => {
//   try {
//     const lists = await getLists();

//     return res.status(200).json(lists);
//   } catch (error) {
//     console.error(error);
//     return res.sendStatus(400);
//   }
// };

// export const getList = async (req: express.Request, res: express.Response) => {
//   try {
//     const { id } = req.params;
//     const list = await getListById(id);

//     return res.status(200).json(list);
//   } catch (error) {
//     console.error(error);
//     return res.sendStatus(400);
//   }
// };

// export const deleteList = async (
//   req: express.Request,
//   res: express.Response
// ) => {
//   try {
//     const { listid } = req.params;

//     const list = await getListById(listid);
//     if (!list) {
//       return res.status(400).send({ message: "List not found" });
//     }

//     // If there are entries, delete them too
//     // Use some deleteMany function

//     // Remove the list from the user too
//     const user = await getUserById(list.userid);
//     if (!user) {
//       return res.status(400).send({ message: "Corresponding user not found" });
//     }

//     await removeListItem(listid, list.userid);

//     const deletedList = await deleteListById(listid);

//     return res.json(deletedList);
//   } catch (error) {
//     console.error(error);
//     return res.sendStatus(400);
//   }
// };

// export const updateList = async (
//   req: express.Request,
//   res: express.Response
// ) => {
//   try {
//     const { listid } = req.params;

//     const list = await getListById(listid);

//     // If the user with this id doesn't exist
//     if (!list) {
//       return res.status(400).send({ message: "List not found" });
//     }

//     for (const key in req.body) {
//       if (req.body[key]) {
//         list.set(key, req.body[key]);
//       }
//     }
//     await list.save();

//     return res.status(200).json(list).end();
//   } catch (error) {
//     console.error(error);
//     return res.sendStatus(400);
//   }
// };

// /////////////////////////////////Deprecated/////////////////////////////////
// export const createList = async (
//   req: express.Request,
//   res: express.Response
// ) => {
//   try {
//     const { type, items, userid, mediaType } = req.body;

//     if (!type || !userid || !mediaType || !items) {
//       return res.status(400).send({ message: "Missing Fields" });
//     }

//     const user = await getUserById(userid);
//     if (!user) {
//       return res.status(400).send({ message: "User Not Found" });
//     }

//     if (user.lists && user.lists.length > 0) {
//       const existingList = user.lists.find((list) => list.listType == type);
//       if (existingList) {
//         return res.status(400).send({ message: "List already exists" });
//       }
//     }

//     const list = await createNewList({ type, items, userid, mediaType });

//     // add the list in the user
//     user.lists.push({ id: list._id.toString(), listType: type });
//     await user.save();

//     return res.status(200).json(list).end();
//   } catch (error) {
//     console.error(error);
//     return res.status(400).send({ message: "Some Error Occurred" });
//   }
// };

// export const addListItem = async (
//   req: express.Request,
//   res: express.Response
// ) => {
//   try {
//     const { listType, mediaid, userid, mediaType } = req.body;

//     if (!listType || !userid || !mediaType || !mediaid) {
//       return res.status(400).send({ message: "Missing Fields" });
//     }

//     const user = await getUserById(userid);
//     if (!user) {
//       return res.status(400).send({ message: "User Not Found" });
//     }

//     // If list already exists
//     if (user.lists && user.lists.length > 0) {
//       const existingListIndex = user.lists.findIndex(
//         (list) => list.listType == listType
//       );
//       if (existingListIndex != -1) {
//         const existingList = await getListById(
//           user.lists[existingListIndex].id
//         );
//         // If the item already exists
//         const existingItem = existingList.items.includes(mediaid);
//         if (existingItem) {
//           return res
//             .status(400)
//             .send({ message: "Item already exists in the list" });
//         }
//         // If item doesn't exist already
//         existingList.items.push(mediaid);
//         const updatedList = await existingList.save();
//         return res
//           .status(200)
//           .json({ ...updatedList, message: `Added to ${listType} list` })
//           .end();
//       }
//     }

//     // If list doesn't exist already
//     const list = await createNewList({
//       type: listType,
//       items: [mediaid],
//       userid,
//       mediaType,
//     });

//     // add the list in the user
//     user.lists.push({ id: list._id.toString(), listType });
//     await user.save();

//     return res.status(200).json(list).end();
//   } catch (error) {
//     console.error(error);
//     return res.status(400).send({ message: "Some Error Occurred" });
//   }
// };
