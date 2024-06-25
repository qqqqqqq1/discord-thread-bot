import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import he from 'he';
import ytSearch from 'yt-search';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const linksWithThreads = new Set();

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    console.log(`${message.author.username} in #${message.channel.name}: ${message.content}`);

    // Ensure the message is from the "promotion" channel within a guild
    if (!message.channel.name.includes('promotion') || !message.guild) {
        return;
    }

    // Ensure the message contains a link to Bandcamp, SoundCloud, YouTube, Spotify, or Twitter
    const hasLinkToBandcamp = message.content.includes('bandcamp.com');
    const hasLinkToSoundCloud = message.content.includes('soundcloud.com');
    const hasLinkToYouTube = message.content.includes('youtube.com') || message.content.includes('youtu.be');
    const hasLinkToSpotify = message.content.includes('spotify.com');
    const hasLinkToTwitter = message.content.includes('twitter.com') || message.content.includes('x.com');

    if (!hasLinkToBandcamp && !hasLinkToSoundCloud && !hasLinkToYouTube && !hasLinkToSpotify && !hasLinkToTwitter) {
        console.log('Message does not contain a link to Bandcamp, SoundCloud, YouTube, Spotify, or Twitter, ignoring.');
        return;
    }

    // Extract the URL from the message content
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const urlMatch = message.content.match(urlRegex);
    if (!urlMatch) {
        console.log('No URL found in the message.');
        return;
    }
    const url = urlMatch[0];

    // Check if the link already has a thread
    if (linksWithThreads.has(url)) {
        console.log('Link already has an associated thread, ignoring.');
        return;
    }

    // Check if the message already has a thread
    if (message.hasThread) {
        console.log('Message already has an associated thread, ignoring.');
        linksWithThreads.add(url); // Ensure the URL is added to the set even if the thread already exists
        return;
    }

    try {
        console.log('Attempting to create a thread for the message.');

        let title = '';
        let description = '';
        let credits = '';

        if (hasLinkToTwitter) {
            title = 'Twitter Link, see thread';
            description = 'This is a link to a Twitter thread. Please click the link to view the content.';
        } else if (hasLinkToBandcamp || hasLinkToSoundCloud) {
            // Fetch the webpage HTML
            const response = await fetch(url);
            const html = await response.text();

            // Parse HTML to get the webpage title and description
            const $ = cheerio.load(html);
            title = $('title').text().trim();
            const descriptionMetaTag = $('meta[name="description"]').attr('content');
            description = descriptionMetaTag ? he.decode(descriptionMetaTag.trim()) : 'No description available.';

            // Adjust title for Bandcamp links
            if (hasLinkToBandcamp) {
                // Split the title around the " | " character
                const parts = title.split(' | ');
                if (parts.length === 2) {
                    // Reformat to have artist first and album name second, separated by "-"
                    title = `${parts[1]} - ${parts[0]}`;
                }

                // Extract album credits from Bandcamp
                const creditsSection = $('.tralbum-credits').text().trim();
                if (creditsSection) {
                    credits = `\n\n**Album Credits:**\n${creditsSection}`;
                }
            }

            // Adjust title for SoundCloud links (if needed)
            if (hasLinkToSoundCloud) {
                title = title.replace(/^Stream\s/, ''); // Remove "Stream" if it's the first word
                title = title.replace('Listen to ', ''); // Remove "Listen to"
                title = title.replace('playlist online for free on SoundCloud', ''); // Remove "useless playlist information"
                title = title.replace('Listen online for free on SoundCloud', ''); // Remove "Listen online for free on SoundCloud"
            }
        } else if (hasLinkToYouTube) {
            // Fetch YouTube video details
            const videoInfo = await ytSearch({ videoId: getYouTubeVideoId(url) });
            if (videoInfo && videoInfo.title) {
                title = videoInfo.title;
                description = videoInfo.description;
            } else {
                description = 'No description available.';
            }
        } else if (hasLinkToSpotify) {
            // Fetch Spotify album details
            try {
                const { title: spotifyTitle, albumInfo } = await getSpotifyAlbumInfo(url);
                if (!spotifyTitle) {
                    console.log('Thread title is empty or exceeds 100 characters.');
                    return;
                }

                title = spotifyTitle;

                // Set description with artist and tracks
                description = `**Artist:** ${albumInfo.albumArtists}\n\n**Tracks:**\n${albumInfo.tracks}`;

                // Sanitize description to remove Discord links
                description = sanitizeDescription(description);
            } catch (error) {
                console.error('Error fetching Spotify album info:', error);
                return;
            }
        }

        // Trim any extra whitespace
        title = title.trim();

        // Ensure title length is within Discord's limits
        if (title.length === 0) {
            console.log('Thread title is empty.');
            return;
        } else if (title.length > 100) {
            console.log('Thread title exceeds 100 characters.');
            title = title.slice(0, 100); // Truncate title if it exceeds the limit
        }

        // Create a thread for the message
        const thread = await message.startThread({
            name: title,
            autoArchiveDuration: 10080, // 7 days in minutes (7 * 24 * 60)
            reason: 'Creating thread for promotion message with Bandcamp, SoundCloud, YouTube, Spotify, or Twitter link',
        });
        console.log(`Created thread: ${thread.name}`);

        // Add URL to the Set
        linksWithThreads.add(url);

        // Send the description and credits to the thread
        await sendLongMessage(thread, description + credits);
        console.log('Sent description and credits to thread.');
    } catch (error) {
        if (error.code === 'MessageExistingThread' || error.code === 160004) {
            console.log('Thread already exists for this message.');
            linksWithThreads.add(url); // Ensure the URL is added to the set even if the thread creation fails
        } else {
            console.error('Error creating thread:', error);
        }
    }
});

async function getSpotifyAccessToken() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        },
        body: 'grant_type=client_credentials'
    });

    const data = await response.json();
    return data.access_token;
}

async function getSpotifyAlbumInfo(url) {
    const accessToken = await getSpotifyAccessToken();
    
    // Extract the album ID from the URL
    const albumIdMatch = url.match(/album\/([a-zA-Z0-9]+)/);
    const albumId = albumIdMatch ? albumIdMatch[1] : null;
    
    if (!albumId) {
        throw new Error('Invalid Spotify album URL');
    }

    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
    });

    const albumInfo = await response.json();
    
    // Extract album name and artists
    const albumName = albumInfo.name;
    const albumArtists = albumInfo.artists.map(artist => artist.name).join(', ');
    
    // Extract tracks
    const tracks = albumInfo.tracks.items.map(track => track.name).join('\n');

    // Construct the thread title in the desired format
    let title = `${albumArtists} - ${albumName}`;

    // Trim any extra whitespace
    title = title.trim();

    // Ensure title length is within Discord's limits
    if (title.length === 0) {
        console.log('Thread title is empty.');
        return null;
    } else if (title.length > 100) {
        console.log('Thread title exceeds 100 characters.');
        title = title.slice(0, 100); // Truncate title if it exceeds the limit
    }

    return { title, albumInfo: { albumArtists, tracks } };
}

function getYouTubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function sanitizeDescription(description) {
    // Replace Discord invite links with empty string
    return description.replace(/discord\.(gg|com\/invite)\/\w+/gi, '');
}

async function sendLongMessage(thread, content) {
    const maxLength = 2000;
    while (content.length > 0) {
        const chunk = content.slice(0, maxLength);
        content = content.slice(maxLength);
        await thread.send(chunk);
    }
}

client.login(process.env.DISCORD_TOKEN);