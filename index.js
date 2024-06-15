import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    console.log('Message received:', message.content);

    // Ensure the message is from the "promotion" channel within a guild
    if (message.channel.name !== 'promotion' || !message.guild) {
        console.log('Not from the "promotion" channel, ignoring.');
        return;
    }

    // Ensure the message contains a link to Bandcamp or SoundCloud
    const hasLinkToBandcamp = message.content.includes('bandcamp.com');
    const hasLinkToSoundCloud = message.content.includes('soundcloud.com');

    if (!hasLinkToBandcamp && !hasLinkToSoundCloud) {
        console.log('Message does not contain a link to Bandcamp or SoundCloud, ignoring.');
        return;
    }

    try {
        console.log('Attempting to create a thread for the message.');

        // Extract the URL from the message content
        const urlRegex = /(https?:\/\/[^\s]+)/;
        const urlMatch = message.content.match(urlRegex);
        if (!urlMatch) {
            console.log('No URL found in the message.');
            return;
        }
        const url = urlMatch[0];

        // Fetch the webpage HTML
        const response = await fetch(url);
        const html = await response.text();

        // Parse HTML to get the webpage title and release date
        const $ = cheerio.load(html);
        let title = $('title').text();
        let releaseDate = $('.tralbumData.tralbum-credits').text().trim();

        // Adjust title for Bandcamp links
        if (hasLinkToBandcamp) {
            // Split the release date to get only the date part
            const dateParts = releaseDate.split(' ');
            releaseDate = dateParts.slice(1).join(' '); // Join the remaining parts (excluding "released") to get the date
            // Split the title around the " | " character
            const parts = title.split(' | ');
            if (parts.length === 2) {
                // Reformat to have artist first, date second, and album name third, separated by "-"
                title = `${parts[1]} - ${releaseDate} - ${parts[0]}`;
            }
        }

        // Adjust title for SoundCloud links (if needed)
        if (hasLinkToSoundCloud) {
            title = title.replace('Listen to ', ''); // Remove "Listen to"
            title = title.replace('Listen online for free on SoundCloud', ''); // Remove "Listen online for free on SoundCloud"
        }

        // Trim any extra whitespace
        title = title.trim();

        // Create a thread for the message
        const thread = await message.startThread({
            name: title,
            autoArchiveDuration: 10080, // 7 days in minutes (7 * 24 * 60)
            reason: 'Creating thread for promotion message with Bandcamp or SoundCloud link',
        });
        console.log(`Created thread: ${thread.name}`);
    } catch (error) {
        console.error('Error creating thread:', error);
    }
});

client.login(process.env.DISCORD_TOKEN);
