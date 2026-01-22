
# Implementation Plan - Role Play Mode

The user wants to add a new training mode called "Juego de Roles" (Role Play). This mode will present a specific role and a short description for the MC to enact.

## Proposed Changes

### 1. `types.ts`
- Add `'role_play'` to `TrainingMode` type.
- Add `'role_play'` to `ALL_TRAINING_MODES` array.

### 2. `data/roles.ts` (New File)
- Create a constant array `ROLES` containing objects with `role` and `description` based on the user's list.

### 3. `App.tsx`
- Add `'Juego de Roles'` to `MODE_TRANSLATIONS`.
- Update `prepareContent` in `useEffect` to handle `'role_play'`.
    - It should generate or pick a random role from the pool.
- Update the generator display area to show the Role and Description properly.

### 4. `services/geminiService.ts`
- Add a helper `generateRolePlay` (or similar) or simply export the static list if no AI generation is needed for now. Since the user gave a specific list, we will use that list as the "pool".

### 5. `components/TopicGenerator.tsx`
- Update component to handle `role_play` mode rendering (showing Role Title + Subtitle Description).

## Verification Plan

### Manual Verification
1.  **Select Mode**: Open the app and spin the roulette until "Juego de Roles" is selected (may need to spin multiple times or temporarily force it).
2.  **Verify UI**: Check that the screen displays "Juego de Roles".
3.  **Verify Content**: Ensure a role (e.g., "Doctor") and its description ("Veamos cómo diagnosticas...") appear in the generator box.
4.  **Verify Regeneration**: Click "Nueva Temática" (or equivalent) and ensure it cycles to another role.
