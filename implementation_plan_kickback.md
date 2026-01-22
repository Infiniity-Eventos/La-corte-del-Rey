# Implementation Plan - Force Boom Bap on Kick Back

The user wants to ensure that whenever the "Kick Back" format is selected in the roulette, the beat genre is automatically set to "Boom Bap".

## Proposed Changes

### `components/SlotMachine.tsx`

- Update the `handleSpin` function's timeout logic for the 3rd column (Genre).
- Modify the condition to force `BeatGenre.BOOM_BAP` if `isReplica` is true OR if `prev.format` is `TrainingFormat.KICK_BACK`.

## Verification Plan

### Manual Verification
1.  Open the application.
2.  Spin the roulette until "Kick Back" is selected (or force it if possible, otherwise just keep spinning).
3.  Verify that when "Kick Back" lands, the "Estímulo" (Mode) automatically becomes "Sangre" (already implemented) AND the "Beat" automatically becomes "Boom Bap".
