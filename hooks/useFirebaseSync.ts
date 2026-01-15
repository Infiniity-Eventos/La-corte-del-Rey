import { useEffect, useState, useRef } from 'react';
import { database } from '../firebaseConfig';
import { ref, onValue, set, push, runTransaction, remove, get } from 'firebase/database';
import { SpectatorState } from '../types';

interface InternalState {
    gameState: SpectatorState | null;
    voteData: {
        votesA: number;
        votesB: number;
        history: any[];
        votedUsers: string[]; // List of user IDs who voted
    };
    animationTrigger: { type: string, payload: any } | null;
}

export const useFirebaseSync = (isSpectator: boolean, viewerName: string = 'Anonymous') => {
    // Local State replicate from Firebase
    const [gameState, setGameState] = useState<SpectatorState | null>(null);
    const [voteData, setVoteData] = useState({ votesA: 0, votesB: 0, history: [] as any[], votedUsers: [] as string[] });
    const [animationTrigger, setAnimationTrigger] = useState<{ type: string, payload: any } | null>(null);

    // Refs to avoid loops
    const lastTriggerIdRef = useRef<string | null>(null);

    // --- ADMIN FUNCTIONS (Write to DB) ---

    const updateGameState = (newState: SpectatorState) => {
        if (isSpectator) return;
        set(ref(database, 'gameState'), newState);
    };

    const triggerAnimation = (triggerType: string, payload: any) => {
        if (isSpectator) return;
        // We push a new trigger to ensure unique events are caught
        const newTriggerRef = push(ref(database, 'triggers'));
        set(newTriggerRef, {
            type: triggerType,
            payload,
            timestamp: Date.now()
        });
    };

    const resetVotes = () => {
        if (isSpectator) return;
        set(ref(database, 'votes'), {
            A: 0,
            B: 0,
            history: {},
            voters: {}
        });
    };

    // --- SPECTATOR FUNCTIONS (Write Votes) ---

    const castVote = async (vote: 'A' | 'B', rivalA: string, rivalB: string) => {
        if (!isSpectator) return;

        // Transaction to ensure atomic increments and prevent double voting (though UI prevents it too)
        const voteRef = ref(database, 'votes');

        // We use a safe transaction to update counts and add voter
        // Note: For simplicity in this app, we just push the vote msg and inc counter.
        // A robust solution would check 'voters/{viewerName}' exists.

        try {
            await runTransaction(voteRef, (currentData) => {
                if (!currentData) {
                    currentData = { A: 0, B: 0, history: {}, voters: {} };
                }
                if (!currentData.voters) currentData.voters = {};

                // CRITICAL: Prevent double voting (Ghost Votes)
                if (currentData.voters[viewerName]) {
                    // User already voted. Do nothing.
                    return; // Abort transaction (return undefined? or return currentData?)
                    // If we return undefined, transaction is aborted. 
                    // However, returning currentData means "no change". 
                    // Let's return currentData to be safe and just NOT increment.
                    return currentData;
                }

                if (vote === 'A') currentData.A = (currentData.A || 0) + 1;
                if (vote === 'B') currentData.B = (currentData.B || 0) + 1;

                // Add History
                const newHistoryItem = {
                    user: viewerName,
                    vote,
                    rivalA: rivalA || 'MC AZUL', // Store context
                    rivalB: rivalB || 'MC ROJO', // Store context
                    timestamp: Date.now()
                };
                if (!currentData.history) currentData.history = {};
                // Create a random ID for the history item
                const histId = 'vote_' + Math.random().toString(36).substr(2, 9);
                currentData.history[histId] = newHistoryItem;

                if (!currentData.voters) currentData.voters = {};
                currentData.voters[viewerName] = true;

                return currentData;
            });
        } catch (e) {
            console.error("Vote transaction failed", e);
        }
    };

    // --- SHARED LISTENERS ---

    useEffect(() => {
        // 1. Listen to GAME STATE
        const unsubscribeGameState = onValue(ref(database, 'gameState'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setGameState(data);
            }
        });

        // 2. Listen to VOTES (Everyone needs to see live results?)
        // Admin needs it. Spectator might want to see it too or just the winner?
        // App.tsx shows counts? Yes, it has setVotesA/B.
        const unsubscribeVotes = onValue(ref(database, 'votes'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const listHistory = data.history ? Object.values(data.history) : [];

                setVoteData({
                    votesA: data.A || 0,
                    votesB: data.B || 0,
                    // Return raw history objects (user, vote, timestamp) sorted by timestamp desc
                    history: listHistory.sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 5),
                    votedUsers: data.voters ? Object.keys(data.voters) : []
                });
            } else {
                setVoteData({ votesA: 0, votesB: 0, history: [], votedUsers: [] });
            }
        });

        // 3. Listen to TRIGGERS (Spectators need this for glitch/winner)
        const unsubscribeTriggers = onValue(ref(database, 'triggers'), (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Get latest trigger
                const keys = Object.keys(data);
                const lastKey = keys[keys.length - 1];
                const lastTrigger = data[lastKey];

                // Check if we already processed this ID (simple local dedup)
                if (lastKey !== lastTriggerIdRef.current) {
                    // Only fire if timestamp is recent (within last 5 seconds) to avoid re-triggering old events on reload
                    if (Date.now() - lastTrigger.timestamp < 5000) {
                        setAnimationTrigger({ type: lastTrigger.type, payload: lastTrigger.payload });
                    }
                    lastTriggerIdRef.current = lastKey;
                }
            }
        });

        return () => {
            unsubscribeGameState();
            unsubscribeVotes();
            unsubscribeTriggers();
        };
    }, []);

    return {
        gameState,
        updateGameState,
        triggerAnimation,
        castVote,
        voteData,
        resetVotes,
        animationTrigger
    };
};
