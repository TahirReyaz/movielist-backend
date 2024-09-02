# movielist-backend

## What is it for?

- Users can create different kinds of watchlists.
- Users can get details of different movies and shows.
- User can search for movies and shows using just the title or a lot of other filters.
- Users can share their watchlists and follow each other.
- Stats are generated based on the data stored in users watchlists such total number of movies and shows watched, total time watched, distribute entries according to country, language, release year, genre, cast and crew, etc.
- Generation of Activity when a new entry is added or updated.
- Like and Comment on activities.
- Generation of Notifications when user's Activities are liked or commented on
  
##  Technical Features

- Runs on node.js
- Crypto for hashing passwords
- Uses express for the server
- Uses Mongodb and mongoose for database
- TMDB API for details of movies and shows
- Firebase for storing images

## Installation notes

- connect to a mongo cluster by getting the url
- install npm packages using `npm i`
- Add an .env file and provide data according to the .env-example file
- run the project using `npm run dev`

