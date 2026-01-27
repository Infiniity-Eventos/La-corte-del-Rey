
interface YouTubeVideo {
    id: {
        videoId: string;
    };
    snippet: {
        title: string;
        thumbnails: {
            default: { url: string };
            medium: { url: string };
            high: { url: string };
        };
        channelTitle: string;
    };
}

interface YouTubeSearchResponse {
    items: YouTubeVideo[];
}

const envKeys = import.meta.env.VITE_YOUTUBE_API_KEY || '';
const API_KEYS = envKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
let currentKeyIndex = 0;

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const searchYouTubeVideos = async (query: string, pageToken?: string): Promise<{ items: YouTubeVideo[], nextPageToken?: string }> => {
    if (API_KEYS.length === 0) {
        console.warn("YouTube API Key is missing!");
        return { items: [] };
    }

    // Try keys starting from current index
    for (let attempt = 0; attempt < API_KEYS.length; attempt++) {
        // Calculate actual key index based on offset
        const keyIndex = (currentKeyIndex + attempt) % API_KEYS.length;
        const apiKey = API_KEYS[keyIndex];

        try {
            let url = `${BASE_URL}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`;
            if (pageToken) {
                url += `&pageToken=${pageToken}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                // Check for Quota Error (403)
                if (response.status === 403) {
                    const errorData = await response.json();
                    // Log warning but continue to next key
                    console.warn(`Key #${keyIndex} failed (Quota/Error). Switching to next key...`, errorData);

                    // If this was the last key to try, throw error
                    if (attempt === API_KEYS.length - 1) {
                        console.error('All API keys exhausted.');
                        throw new Error('All YouTube API keys exhausted');
                    }

                    // Continue loop to try next key
                    continue;
                }

                // Other errors
                const errorData = await response.json();
                console.error('YouTube API Error:', errorData);
                throw new Error('Failed to fetch from YouTube API');
            }

            // If successful, update the primary index to stick with this good key
            currentKeyIndex = keyIndex;

            const data: YouTubeSearchResponse & { nextPageToken?: string } = await response.json();
            return { items: data.items || [], nextPageToken: data.nextPageToken };

        } catch (error: any) {
            // Only suppress error if we are continuing the loop for quota issues
            // If it's the valid "loop continue" case, we won't reach here (except for throw inside if)
            // But if fetch fails entirely (network), we might want to try next key too? 
            // Usually network failure is local, but let's be robust.

            console.error(`Error with key #${keyIndex}:`, error);

            // If we have more keys to try, continue
            if (attempt < API_KEYS.length - 1) {
                continue;
            }

            // Else return empty
            return { items: [] };
        }
    }

    return { items: [] };
};
