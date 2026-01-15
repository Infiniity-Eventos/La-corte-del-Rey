
import React, { useEffect, useState } from 'react';
import { BeatGenre } from '../types';

interface AudioPlayerProps {
  genre: BeatGenre;
}

// Valid Mixcloud Paths (User/Slug)
// We use paths to specific mixes or profiles known for these genres
const MIX_LISTS: Record<BeatGenre, string[]> = {
  [BeatGenre.ELECTRO]: [
    "/Monstercat/call-of-the-wild-460/",
    "/SpinninRecords/spinnin-sessions-510/",
    "/deadmau5/deadmau5-presents-mau5trap-radio-240/"
  ],
  [BeatGenre.TRAP]: [
    "/TrapMusicHD/best-trap-music-mix-2021-hip-hop-2021/",
    "/TrapCity/trap-city-mix-2018/",
    "/dj-simon-p/trap-hip-hop-mix-2023/"
  ],
  [BeatGenre.DRILL]: [
    "/DJ_M_A_R_K/uk-drill-mix-2023-vol-1/",
    "/dj-limelight/uk-drill-mix-april-2021/",
    "/KennyAllstar/kenny-allstar-bbc-1xtra-mix/"
  ],
  [BeatGenre.BOOM_BAP]: [
    "/DJ_P_R/90s-underground-hip-hop-boom-bap-mix-vol-1/",
    "/DJ_P_R/90s-underground-hip-hop-boom-bap-mix-vol-2/",
    "/Roisto/90s-boom-bap-hiphop-mix/"
  ],
  [BeatGenre.REGGAE]: [
    "/Selecta_J/reggae-classics-mix/",
    "/dj-simon-p/reggae-vibes-2023/",
    "/Roisto/reggae-instrumentals/"
  ],
  [BeatGenre.DOUBLE_TEMPO]: [
    "/TrapCity/trap-city-mix-2018/",
    "/KennyAllstar/kenny-allstar-bbc-1xtra-mix/",
    "/dj-limelight/uk-drill-mix-april-2021/"
  ],
  [BeatGenre.REGGAETON]: [
    "/DJ_Nelson/reggaeton-clasico-vol-1/",
    "/dj-b-boy-3/reggaeton-old-school-mix/",
    "/latin-mix-masters/reggaeton-summer-mix-2023/"
  ],
  [BeatGenre.DANCEHALL]: [
    "/DJ_Nelson/reggaeton-clasico-vol-1/",
    "/dj-b-boy-3/reggaeton-old-school-mix/",
    "/latin-mix-masters/reggaeton-summer-mix-2023/"
  ]
};

// Fallback paths if specific ones fail (using broader tag/user paths)
const FALLBACK_PATHS: Record<BeatGenre, string> = {
  [BeatGenre.ELECTRO]: "/Monstercat/call-of-the-wild-460/",
  [BeatGenre.TRAP]: "/TrapMusicHD/best-trap-music-mix-2020/",
  [BeatGenre.DRILL]: "/DJ_M_A_R_K/uk-drill-mix-2022/",
  [BeatGenre.BOOM_BAP]: "/Roisto/90s-hiphop-boom-bap-mix-vol-2/",
  [BeatGenre.REGGAE]: "/Selecta_J/reggae-classics-mix/",
  [BeatGenre.DOUBLE_TEMPO]: "/DJ_M_A_R_K/uk-drill-mix-2022/",
  [BeatGenre.REGGAETON]: "/dj-b-boy-3/reggaeton-mix-2022/",
  [BeatGenre.DANCEHALL]: "/dj-b-boy-3/reggaeton-mix-2022/"
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ genre }) => {
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  useEffect(() => {
    // 1. Get the list for the genre
    const mixes = MIX_LISTS[genre] || MIX_LISTS[BeatGenre.BOOM_BAP];
    
    // 2. Select a random mix
    let randomMixPath = mixes[Math.floor(Math.random() * mixes.length)];
    
    // Safety check: ensure path starts with /
    if (!randomMixPath.startsWith('/')) {
        randomMixPath = FALLBACK_PATHS[genre] || "/Monstercat/call-of-the-wild-460/";
    }

    // 3. Encode the Path (Mixcloud requires the path to be URL encoded)
    // The feed param expects: /User/Slug/
    const encodedFeed = encodeURIComponent(randomMixPath);
    
    // 4. Construct Mixcloud URL
    // mini=1 makes it a small bar
    // hide_cover=1 removes the album art to save space
    // autoplay=1 tries to auto start
    // light=1 makes it light theme (optional, removed here for dark mode app feel)
    setIframeSrc(`https://www.mixcloud.com/widget/iframe/?hide_cover=1&mini=1&feed=${encodedFeed}&autoplay=1`);
  }, [genre]);

  if (!iframeSrc) return null;

  return (
    <div className="w-full mt-6 bg-purple-950/40 rounded-xl overflow-hidden border border-purple-800 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-fadeIn">
       <iframe 
         width="100%" 
         height="120" 
         src={iframeSrc}
         frameBorder="0" 
         allow="autoplay"
         title="Mixcloud Player"
       ></iframe>
    </div>
  );
};