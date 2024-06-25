Certainly. I'll provide technical documentation for this Discord bot. Here's a structured overview of its functionality, components, and setup:

# Discord Promotion Bot - Technical Documentation

## Overview
This Discord bot is designed to automatically create threads for promotional messages containing links to music platforms (Bandcamp, SoundCloud, YouTube, Spotify) or Twitter in a designated "promotion" channel. It extracts information from the linked content and creates a thread with relevant details.

## Dependencies
- discord.js
- node-fetch
- cheerio
- he (HTML entity encoder/decoder)
- yt-search
- dotenv

## Setup
1. Install dependencies using npm:
   ```
   npm install discord.js node-fetch cheerio he yt-search dotenv
   ```

2. Create a `.env` file with the following environment variables:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   SPOTIFY_CLIENT_ID=your_spotify_client_id
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
   ```

3. Ensure the bot has necessary permissions in the Discord server, including the ability to read messages and create threads.

## Main Components

### 1. Discord Client Setup
- Initializes a Discord client with intents for Guilds, GuildMessages, and MessageContent.

### 2. Message Handling
- Listens for 'messageCreate' events in channels containing "promotion" in their name.
- Checks for links to supported platforms (Bandcamp, SoundCloud, YouTube, Spotify, Twitter).

### 3. Thread Creation
- Creates a new thread for each unique promotional link.
- Stores created threads in a Set to prevent duplicates.

### 4. Content Extraction
- Bandcamp/SoundCloud: Uses cheerio to scrape webpage title and description.
- YouTube: Utilizes yt-search to fetch video details.
- Spotify: Calls Spotify API to get album information.
- Twitter: Provides a generic message for Twitter links.

### 5. Spotify Integration
- Implements Spotify API authentication using client credentials flow.
- Fetches album details including artists and track listings.

## Key Functions

### `getSpotifyAccessToken()`
- Retrieves an access token for Spotify API requests.

### `getSpotifyAlbumInfo(url)`
- Extracts album ID from URL and fetches album details from Spotify API.
- Returns formatted title and album information.

### `getYouTubeVideoId(url)`
- Extracts video ID from YouTube URLs.

### `sanitizeDescription(description)`
- Removes Discord invite links from the description.

### `sendLongMessage(thread, content)`
- Splits long messages into chunks to comply with Discord's message length limits.

## Error Handling
- Catches and logs errors during thread creation and API requests.
- Handles cases where threads already exist for a message.

## Limitations and Considerations
- Thread titles are limited to 100 characters, truncating if necessary.
- The bot only processes messages in channels containing "promotion" in their name.
- It relies on external services (Spotify API, web scraping) which may require maintenance if their structures change.

## Running the Bot
Execute the script using Node.js:
```
node bot.js
```

Ensure that the Discord bot token and Spotify API credentials are correctly set in the `.env` file before running.

This documentation provides an overview of the bot's functionality and structure. For any modifications or further development, refer to the inline comments in the code for detailed explanations of specific sections.
