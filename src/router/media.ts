import express from 'express';

import { getUpcomingMovies } from '../controllers/media.js';

export default (router: express.Router) => {
    router.get('/movie/upcoming', getUpcomingMovies);
    // router.delete('/users/:id', isAuthenticated, isOwner, deleteUser);
    // router.patch('/users/:id', isAuthenticated, isOwner, updateUser);
}