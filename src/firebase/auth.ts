import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, OAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { firebaseConfig } from "./config";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new OAuthProvider('oidc.authelia');

let currentUser: User | null = null;

const initAuth = (onUserChanged: (user: User | null) => void) => {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        onUserChanged(user);
    });
};

const login = async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (error: any) {
        console.error("Login Error:", error);
        alert("ログインに失敗しました: " + error.message);
    }
};

const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

export { auth, currentUser, initAuth, login, logout };
