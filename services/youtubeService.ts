
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

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const searchYouTubeVideos = async (query: string, pageToken?: string): Promise<{ items: YouTubeVideo[], nextPageToken?: string }> => {
    if (!API_KEY) {
        console.warn("YouTube API Key is missing!");
        return { items: [] };
    }

    try {
        let url = `${BASE_URL}/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=10&key=${API_KEY}`;
        if (pageToken) {
            url += `&pageToken=${pageToken}`;
        }

        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('YouTube API Error:', errorData);
            throw new Error('Failed to fetch from YouTube API');
        }

        const data: YouTubeSearchResponse & { nextPageToken?: string } = await response.json();
        return { items: data.items || [], nextPageToken: data.nextPageToken };
    } catch (error) {
        console.error('Error fetching YouTube videos:', error);
        return { items: [] };
    }
};
