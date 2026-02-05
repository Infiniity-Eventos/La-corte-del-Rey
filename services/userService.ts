
import { ref, set, get, update, child, remove } from "firebase/database";
import { database } from "../firebaseConfig";

export interface User {
    username: string;
    password?: string; // Stored for simple matching (local/low-security requirement)
    status: 'pending' | 'approved' | 'rejected';
    createdAt: number;
}

const USERS_REF = 'users';

// Register a new user
export const registerUser = async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
        const userRef = ref(database);
        const snapshot = await get(child(userRef, `${USERS_REF}/${username}`));

        if (snapshot.exists()) {
            return { success: false, message: 'El usuario ya existe' };
        }

        await set(ref(database, `${USERS_REF}/${username}`), {
            username,
            password,
            status: 'pending',
            createdAt: Date.now()
        });

        return { success: true, message: 'Registro exitoso. Esperando aprobación del admin.' };
    } catch (error) {
        console.error("Error registering user:", error);
        return { success: false, message: 'Error al registrar usuario' };
    }
};

// Login user
export const loginUser = async (username: string, password: string): Promise<{ success: boolean; message: string; user?: User }> => {
    try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, `${USERS_REF}/${username}`));

        if (!snapshot.exists()) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        const userData = snapshot.val() as User;

        if (userData.password !== password) {
            return { success: false, message: 'Contraseña incorrecta' };
        }

        if (userData.status === 'pending') {
            return { success: false, message: 'Tu cuenta está pendiente de aprobación por el administrador.' };
        }

        if (userData.status === 'rejected') {
            return { success: false, message: 'Tu cuenta ha sido rechazada.' };
        }

        return { success: true, message: 'Login exitoso', user: userData };
    } catch (error) {
        console.error("Error logging in:", error);
        return { success: false, message: 'Error al iniciar sesión' };
    }
};

// Get all pending users (For Admin)
export const getPendingUsers = async (): Promise<User[]> => {
    try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, USERS_REF));

        if (!snapshot.exists()) return [];

        const users: User[] = [];
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            if (user.status === 'pending') {
                users.push(user);
            }
        });

        return users;
    } catch (error) {
        console.error("Error fetching pending users:", error);
        return [];
    }
};

// Get ALL users (For Admin)
export const getAllUsers = async (): Promise<User[]> => {
    try {
        const dbRef = ref(database);
        const snapshot = await get(child(dbRef, USERS_REF));

        if (!snapshot.exists()) return [];

        const users: User[] = [];
        snapshot.forEach((childSnapshot) => {
            users.push(childSnapshot.val());
        });

        return users;
    } catch (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
};

// Approve user
export const approveUser = async (username: string): Promise<boolean> => {
    try {
        const userRef = ref(database, `${USERS_REF}/${username}`);
        await update(userRef, { status: 'approved' });
        return true;
    } catch (error) {
        console.error("Error approving user:", error);
        return false;
    }
};

// Reject/Delete user
export const rejectUser = async (username: string): Promise<boolean> => {
    try {
        const userRef = ref(database, `${USERS_REF}/${username}`);
        await remove(userRef); // Or set status to 'rejected' if we want to keep record
        return true;
    } catch (error) {
        console.error("Error rejecting user:", error);
        return false;
    }
};
