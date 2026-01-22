# Implementation Plan - Structure Modes

The user wants two new modes: "Estructura Easy" and "Estructura Hard".
These modes display 4-bar patterns (e.g., A A B A).

## Constraints
1.  **Usage**: Only available if Format is `4x4`.
2.  **Hard Mode**: Can only appear/force Beat Genre to `TRAP`.

## Proposed Changes

### 1. `types.ts`
- Add `'structure_easy'` and `'structure_hard'` to `TrainingMode`.
- Add them to `ALL_TRAINING_MODES`.

### 2. `components/SlotMachine.tsx`
- Update `MODE_TRANSLATIONS`.
- Update `handleSpin` logic:
    - **Step 2 (Mode Top)**: Verify `prev.format`. If it is NOT `4x4` and the random mode picked is `structure_easy` or `structure_hard`, switch the mode to `themes` (fallback).
    - **Step 3 (Genre Stop)**: Verify `prev.mode`. If it is `structure_hard`, force `genre` to `TRAP`.

### 3. `App.tsx`
- Update `MODE_TRANSLATIONS`.
- Update `prepareContent`:
    - Case `structure_easy`: Pick random from `['A A B A', 'A B A B', 'A B B A', 'A A B B']`.
    - Case `structure_hard`: Pick random from `['A A BBB A', 'AB AB AB AB']`.
- Note: Pre-generation logic needs to handle these string arrays.

### 4. `components/TopicGenerator.tsx`
- Update display logic for `structure_easy` and `structure_hard`.
- Display the pattern clearly (maybe large letters).

## Verification Plan

### Manual Verification
1.  **Constraint Check**: Spin roulette. If Format != 4x4, ensure Structure modes DO NOT appear.
2.  **Hard Mode Check**: Force SlotMachine to pick Structure Hard (via dev tools or repeated spins). Ensure Beat automatically becomes TRAP.
3.  **Display Check**: Verify the patterns (A A B A, etc.) appear correctly in the generator.
